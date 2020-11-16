import { pipe } from "@principia/prelude";

import * as A from "../../../Array";
import * as L from "../../../List";
import * as O from "../../../Option";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as M from "../../Managed";
import * as Semaphore from "../../Semaphore";
import * as T from "../../Task";
import * as XP from "../../XPromise";
import * as XQ from "../../XQueue";
import * as XR from "../../XRef";
import { foreachManaged } from "../destructors";
import type { Stream } from "../model";

/**
 * Not working
 */
export function distributedWithDynamic_<R, E, O>(
   stream: Stream<R, E, O>,
   maximumLag: number,
   decide: (o: O) => T.IO<(k: symbol) => boolean>,
   done: (ex: Ex.Exit<O.Option<E>, never>) => T.IO<any> = (_: any) => T.unit()
): M.Managed<R, never, T.IO<[symbol, XQ.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
   return M.gen(function* (_) {
      const queuesRef = yield* _(
         pipe(
            XR.makeRef(new Map<symbol, XQ.Queue<Ex.Exit<O.Option<E>, O>>>()),
            T.toManaged((ref) => T.chain_(ref.get, (qs) => T.foreach_(qs.values(), (_) => _.shutdown)))
         )
      );

      const offer = (o: O): T.IO<void> =>
         pipe(
            T.do,
            T.bindS("shouldProcess", () => decide(o)),
            T.bindS("queues", () => queuesRef.get),
            T.chain(({ shouldProcess, queues }) =>
               pipe(
                  T.foldl_(queues, L.empty<symbol>(), (acc, [id, queue]) => {
                     if (shouldProcess(id)) {
                        return pipe(
                           queue.offer(Ex.succeed(o)),
                           T.foldCauseM(
                              (c) => (C.isInterrupt(c) ? T.succeed(L.prepend_(acc, id)) : T.halt(c)),
                              (_) => T.succeed(acc)
                           )
                        );
                     } else {
                        return T.succeed(acc);
                     }
                  }),
                  T.chain((ids) =>
                     !L.isEmpty(ids)
                        ? XR.update_(queuesRef, (m) => {
                             const updated = new Map(m);
                             L.forEach_(ids, (id) => updated.delete(id));
                             return updated;
                          })
                        : T.unit()
                  )
               )
            )
         );

      const add = pipe(
         M.do,
         M.bindS("queuesLock", () => T.toManaged_(Semaphore.makeSemaphore(1))),
         M.bindS("newQueue", () =>
            pipe(
               XR.makeRef<T.IO<[symbol, XQ.Queue<Ex.Exit<O.Option<E>, O>>]>>(
                  pipe(
                     T.do,
                     T.bindS("queue", () => XQ.makeBounded<Ex.Exit<O.Option<E>, O>>(maximumLag)),
                     T.letS("id", () => Symbol()),
                     T.map(({ queue, id }) => [id, queue])
                  )
               ),
               T.toManaged()
            )
         ),
         M.letS("finalize", ({ queuesLock, newQueue }) => (endTake: Ex.Exit<O.Option<E>, never>): T.IO<void> =>
            pipe(
               newQueue.set(
                  pipe(
                     T.do,
                     T.bindS("queue", () => XQ.makeBounded<Ex.Exit<O.Option<E>, O>>(1)),
                     T.tap(({ queue }) => queue.offer(endTake)),
                     T.letS("id", () => Symbol()),
                     T.tap(({ id, queue }) => XR.update_(queuesRef, (_) => _.set(id, queue))),
                     T.map(({ id, queue }) => [id, queue])
                  )
               ),
               T.chain(() => T.do),
               T.bindS("queues", () => T.map_(queuesRef.get, (m) => m.values())),
               T.tap(({ queues }) =>
                  T.foreach_(queues, (queue) =>
                     T.catchSomeCause_(queue.offer(endTake), (c) =>
                        C.isInterrupt(c) ? O.some(T.unit()) : O.none<T.IO<void>>()
                     )
                  )
               ),
               T.tap(() => done(endTake)),
               T.chain(() => T.unit()),
               Semaphore.withPermit(queuesLock)
            )
         ),
         M.tap(({ finalize }) =>
            pipe(
               stream,
               foreachManaged(offer),
               M.foldCauseM(
                  (cause) => T.toManaged_(finalize(Ex.failure(C.map_(cause, O.some)))),
                  () => T.toManaged_(finalize(Ex.fail(O.none())))
               ),
               M.fork
            )
         ),
         M.use(({ queuesLock, newQueue }) => pipe(newQueue.get, T.flatten, Semaphore.withPermit(queuesLock)))
      );
      return yield* _(
         pipe(
            M.ask<R>(),
            M.map((r) => T.giveAll_(add, r))
         )
      );
   });
}

/**
 * Not working
 */
export function distributedWith_<R, E, O>(
   stream: Stream<R, E, O>,
   n: number,
   maximumLag: number,
   decide: (o: O) => T.IO<(k: number) => boolean>
) {
   return pipe(
      XP.make<never, (o: O) => T.IO<(id: symbol) => boolean>>(),
      T.toManaged(),
      M.chain((prom) =>
         pipe(
            distributedWithDynamic_(
               stream,
               maximumLag,
               (o: O) => T.chain_(XP.await(prom), (_) => _(o)),
               (_) => T.unit()
            ),
            M.chain((next) =>
               pipe(
                  L.range(0, n),
                  L.map((id) => T.map_(next, ([key, queue]) => [[key, id], queue] as const)),
                  T.collectAll,
                  T.chain((entries) => {
                     const [mappings, queues] = A.reduceRight_(
                        entries,
                        [new Map<symbol, number>(), L.empty<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>()] as const,
                        ([mapping, queue], [mappings, queues]) =>
                           [mappings.set(mapping[0], mapping[1]), L.append_(queues, queue)] as const
                     );
                     return T.as_(
                        XP.succeed_(prom, (o: O) =>
                           pipe(
                              decide(o),
                              T.map((f) => (key: symbol) => f(mappings.get(key) as number))
                           )
                        ),
                        () => queues
                     );
                  }),
                  T.toManaged()
               )
            )
         )
      )
   );
}
