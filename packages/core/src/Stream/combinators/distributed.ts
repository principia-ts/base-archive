import { pipe } from "@principia/prelude";

import * as A from "../../Array";
import * as I from "../../IO";
import * as C from "../../IO/Cause";
import * as Ex from "../../IO/Exit";
import * as Semaphore from "../../IO/Semaphore";
import * as Ref from "../../IORef";
import * as M from "../../Managed";
import * as Map from "../../Map";
import * as O from "../../Option";
import * as P from "../../Promise";
import * as Queue from "../../Queue";
import { foreachManaged } from "../destructors";
import type { Stream } from "../model";

/**
 * More powerful version of `istributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic<E, O>(
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): <R>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, I.UIO<readonly [symbol, Queue.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  return (stream) => distributedWithDynamic_(stream, maximumLag, decide, done);
}

/**
 * More powerful version of `istributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number,
  decide: (o: O) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): M.Managed<R, never, I.UIO<readonly [symbol, Queue.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  const offer = (
    queuesRef: Ref.URef<ReadonlyMap<symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>>>
  ) => (o: O) =>
    pipe(
      I.do,
      I.bindS("shouldProcess", () => decide(o)),
      I.bindS("queues", () => I.map_(queuesRef.get, (m) => m.entries())),
      I.chain(({ shouldProcess, queues }) =>
        pipe(
          I.reduce_(queues, A.empty<symbol>(), (acc, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                queue.offer(Ex.succeed(o)),
                I.foldCauseM(
                  (c) => (C.interrupted(c) ? I.succeed(A.append_(acc, id)) : I.halt(c)),
                  () => I.succeed(acc)
                )
              );
            } else {
              return I.succeed(acc);
            }
          }),
          I.chain((ids) =>
            A.isNonEmpty(ids) ? Ref.update_(queuesRef, Map.removeMany(ids)) : I.unit()
          )
        )
      )
    );
  return pipe(
    M.do,
    M.bindS("queuesRef", () =>
      pipe(Ref.make(Map.empty<symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>>()), (acquire) =>
        M.make_(acquire, (_) => I.chain_(_.get, (qs) => I.foreach_(qs.values(), (q) => q.shutdown)))
      )
    ),
    M.bindS("add", ({ queuesRef }) => {
      return pipe(
        M.do,
        M.bindS("queuesLock", () => I.toManaged_(Semaphore.make(1))),
        M.bindS("newQueue", () =>
          pipe(
            Ref.make<I.UIO<readonly [symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>]>>(
              pipe(
                I.do,
                I.bindS("queue", () => Queue.makeBounded<Ex.Exit<O.Option<E>, O>>(maximumLag)),
                I.letS("id", () => Symbol()),
                I.tap(({ queue, id }) => Ref.update_(queuesRef, Map.insert(id, queue))),
                I.map(({ id, queue }) => [id, queue])
              )
            ),
            I.toManaged()
          )
        ),
        M.letS("finalize", ({ queuesLock, newQueue }) => {
          return (endTake: Ex.Exit<O.Option<E>, never>) =>
            Semaphore.withPermit(queuesLock)(
              I.chain_(
                newQueue.set(
                  pipe(
                    I.do,
                    I.bindS("queue", () => Queue.makeBounded<Ex.Exit<O.Option<E>, O>>(1)),
                    I.tap(({ queue }) => queue.offer(endTake)),
                    I.letS("id", () => Symbol()),
                    I.tap(({ id, queue }) => Ref.update_(queuesRef, Map.insert(id, queue))),
                    I.map(({ id, queue }) => [id, queue] as const)
                  )
                ),
                () =>
                  pipe(
                    I.do,
                    I.bindS("queues", () => I.map_(queuesRef.get, (m) => [...m.values()])),
                    I.tap(({ queues }) =>
                      I.foreach_(queues, (queue) =>
                        pipe(
                          queue.offer(endTake),
                          I.catchSomeCause((c) =>
                            C.interrupted(c) ? O.some(I.unit()) : O.none<I.UIO<void>>()
                          )
                        )
                      )
                    ),
                    I.tap(() => done(endTake)),
                    I.asUnit
                  )
              )
            );
        }),
        M.tap(({ finalize }) =>
          pipe(
            stream,
            foreachManaged(offer(queuesRef)),
            M.foldCauseM(
              (cause) => I.toManaged_(finalize(Ex.failure(C.map_(cause, O.some)))),
              () => I.toManaged_(finalize(Ex.fail(O.none())))
            ),
            M.fork
          )
        ),
        M.map(({ queuesLock, newQueue }) =>
          Semaphore.withPermit(queuesLock)(I.flatten(newQueue.get))
        )
      );
    }),
    M.map(({ add }) => add)
  );
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith<O>(
  n: number,
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: number) => boolean>
): <R, E>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, ReadonlyArray<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => distributedWith_(stream, n, maximumLag, decide);
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: number) => boolean>
): M.Managed<R, never, ReadonlyArray<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return pipe(
    P.make<never, (_: O) => I.UIO<(_: symbol) => boolean>>(),
    M.fromEffect,
    M.chain((prom) =>
      pipe(
        distributedWithDynamic_(
          stream,
          maximumLag,
          (o) => I.chain_(P.await(prom), (_) => _(o)),
          (_) => I.unit()
        ),
        M.chain((next) =>
          pipe(
            I.collectAll(
              pipe(
                A.range(0, n),
                A.map((id) => I.map_(next, ([key, queue]) => [[key, id], queue] as const))
              )
            ),
            I.chain((entries) => {
              const [mappings, queues] = A.reduceRight_(
                entries,
                [
                  Map.empty<symbol, number>(),
                  A.empty<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>()
                ] as const,
                ([mapping, queue], [mappings, queues]) => [
                  Map.unsafeInsertAt_(mappings, mapping[0], mapping[1]),
                  A.append_(queues, queue)
                ]
              );
              return pipe(
                P.succeed_(prom, (o: O) =>
                  I.map_(decide(o), (f) => (key: symbol) => f(mappings.get(key) as number))
                ),
                I.as(() => queues)
              );
            }),
            M.fromEffect
          )
        )
      )
    )
  );
}
