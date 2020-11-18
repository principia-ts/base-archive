import { pipe } from "@principia/prelude";

import * as A from "../../../Array";
import * as Map from "../../../Map";
import * as O from "../../../Option";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as M from "../../Managed";
import * as Sem from "../../Semaphore";
import * as T from "../../Task";
import * as P from "../../XPromise";
import * as Q from "../../XQueue";
import * as R from "../../XRef";
import { foreachManaged } from "../destructors";
import type { Stream } from "../model";

export function distributedWithDynamic<E, O>(
  maximumLag: number,
  decide: (_: O) => T.IO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => T.IO<any> = (_: any) => T.unit()
): <R>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, T.IO<readonly [symbol, Q.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  return (stream) => distributedWithDynamic_(stream, maximumLag, decide, done);
}

export function distributedWithDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number,
  decide: (o: O) => T.IO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => T.IO<any> = (_: any) => T.unit()
): M.Managed<R, never, T.IO<readonly [symbol, Q.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  const offer = (queuesRef: R.Ref<ReadonlyMap<symbol, Q.Queue<Ex.Exit<O.Option<E>, O>>>>) => (
    o: O
  ) =>
    pipe(
      T.do,
      T.bindS("shouldProcess", () => decide(o)),
      T.bindS("queues", () => T.map_(queuesRef.get, (m) => m.entries())),
      T.chain(({ shouldProcess, queues }) =>
        pipe(
          T.foldLeft_(queues, A.empty<symbol>(), (acc, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                queue.offer(Ex.succeed(o)),
                T.foldCauseM(
                  (c) => (C.interrupted(c) ? T.succeed(A.append_(acc, id)) : T.halt(c)),
                  () => T.succeed(acc)
                )
              );
            } else {
              return T.succeed(acc);
            }
          }),
          T.chain((ids) =>
            A.isNonEmpty(ids) ? R.update_(queuesRef, Map.unsafeDeleteMany(ids)) : T.unit()
          )
        )
      )
    );
  return pipe(
    M.do,
    M.bindS("queuesRef", () =>
      pipe(R.makeRef(Map.empty<symbol, Q.Queue<Ex.Exit<O.Option<E>, O>>>()), (acquire) =>
        M.make_(acquire, (_) => T.chain_(_.get, (qs) => T.foreach_(qs.values(), (q) => q.shutdown)))
      )
    ),
    M.bindS("add", ({ queuesRef }) => {
      return pipe(
        M.do,
        M.bindS("queuesLock", () => T.toManaged_(Sem.makeSemaphore(1))),
        M.bindS("newQueue", () =>
          pipe(
            R.makeRef<T.IO<readonly [symbol, Q.Queue<Ex.Exit<O.Option<E>, O>>]>>(
              pipe(
                T.do,
                T.bindS("queue", () => Q.makeBounded<Ex.Exit<O.Option<E>, O>>(maximumLag)),
                T.letS("id", () => Symbol()),
                T.tap(({ queue, id }) => R.update_(queuesRef, Map.unsafeInsertAt(id, queue))),
                T.map(({ id, queue }) => [id, queue])
              )
            ),
            T.toManaged()
          )
        ),
        M.letS("finalize", ({ queuesLock, newQueue }) => {
          return (endTake: Ex.Exit<O.Option<E>, never>) =>
            Sem.withPermit(queuesLock)(
              T.chain_(
                newQueue.set(
                  pipe(
                    T.do,
                    T.bindS("queue", () => Q.makeBounded<Ex.Exit<O.Option<E>, O>>(1)),
                    T.tap(({ queue }) => queue.offer(endTake)),
                    T.letS("id", () => Symbol()),
                    T.tap(({ id, queue }) => R.update_(queuesRef, Map.unsafeInsertAt(id, queue))),
                    T.map(({ id, queue }) => [id, queue] as const)
                  )
                ),
                () =>
                  pipe(
                    T.do,
                    T.bindS("queues", () => T.map_(queuesRef.get, (m) => [...m.values()])),
                    T.tap(({ queues }) =>
                      T.foreach_(queues, (queue) =>
                        pipe(
                          queue.offer(endTake),
                          T.catchSomeCause((c) =>
                            C.interrupted(c) ? O.some(T.unit()) : O.none<T.IO<void>>()
                          )
                        )
                      )
                    ),
                    T.tap(() => done(endTake)),
                    T.asUnit
                  )
              )
            );
        }),
        M.tap(({ finalize }) =>
          pipe(
            stream,
            foreachManaged(offer(queuesRef)),
            M.foldCauseM(
              (cause) => T.toManaged_(finalize(Ex.failure(C.map_(cause, O.some)))),
              () => T.toManaged_(finalize(Ex.fail(O.none())))
            ),
            M.fork
          )
        ),
        M.map(({ queuesLock, newQueue }) => Sem.withPermit(queuesLock)(T.flatten(newQueue.get)))
      );
    }),
    M.map(({ add }) => add)
  );
}

export function distributedWith<O>(
  n: number,
  maximumLag: number,
  decide: (_: O) => T.IO<(_: number) => boolean>
): <R, E>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, ReadonlyArray<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => distributedWith_(stream, n, maximumLag, decide);
}

export function distributedWith_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number,
  decide: (_: O) => T.IO<(_: number) => boolean>
): M.Managed<R, never, ReadonlyArray<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return pipe(
    P.make<never, (_: O) => T.IO<(_: symbol) => boolean>>(),
    M.fromTask,
    M.chain((prom) =>
      pipe(
        distributedWithDynamic_(
          stream,
          maximumLag,
          (o) => T.chain_(P.await(prom), (_) => _(o)),
          (_) => T.unit()
        ),
        M.chain((next) =>
          pipe(
            T.collectAll(
              pipe(
                A.range(0, n),
                A.map((id) => T.map_(next, ([key, queue]) => [[key, id], queue] as const))
              )
            ),
            T.chain((entries) => {
              const [mappings, queues] = A.reduceRight_(
                entries,
                [
                  Map.empty<symbol, number>(),
                  A.empty<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>()
                ] as const,
                ([mapping, queue], [mappings, queues]) => [
                  Map.unsafeInsertAt_(mappings, mapping[0], mapping[1]),
                  A.append_(queues, queue)
                ]
              );
              return pipe(
                P.succeed_(prom, (o: O) =>
                  T.map_(decide(o), (f) => (key: symbol) => f(mappings.get(key) as number))
                ),
                T.as(() => queues)
              );
            }),
            M.fromTask
          )
        )
      )
    )
  );
}
