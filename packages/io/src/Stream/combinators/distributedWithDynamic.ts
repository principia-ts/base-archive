import type { Stream } from '../core'

import { pipe } from '@principia/base/data/Function'
import * as Map from '@principia/base/data/Map'
import * as O from '@principia/base/data/Option'

import * as Ca from '../../Cause'
import * as C from '../../Chunk'
import * as Ex from '../../Exit'
import * as I from '../../IO'
import * as Ref from '../../IORef'
import * as M from '../../Managed'
import * as Queue from '../../Queue'
import * as Semaphore from '../../Semaphore'
import { foreachManaged } from '../core'

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
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
  return (stream) => distributedWithDynamic_(stream, maximumLag, decide, done)
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
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
  const offer = (queuesRef: Ref.URef<ReadonlyMap<symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>>>) => (o: O) =>
    pipe(
      I.do,
      I.bindS('shouldProcess', () => decide(o)),
      I.bindS('queues', () => I.map_(queuesRef.get, (m) => m.entries())),
      I.flatMap(({ shouldProcess, queues }) =>
        pipe(
          I.reduce_(queues, C.empty<symbol>(), (acc, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                queue.offer(Ex.succeed(o)),
                I.foldCauseM(
                  (c) => (Ca.interrupted(c) ? I.succeed(C.append_(acc, id)) : I.halt(c)),
                  () => I.succeed(acc)
                )
              )
            } else {
              return I.succeed(acc)
            }
          }),
          I.flatMap((ids) => (C.isNonEmpty(ids) ? Ref.update_(queuesRef, Map.removeMany(ids)) : I.unit()))
        )
      )
    )
  return pipe(
    M.do,
    M.bindS('queuesRef', () =>
      pipe(Ref.make(Map.empty<symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>>()), (acquire) =>
        M.make_(acquire, (_) => I.flatMap_(_.get, (qs) => I.foreach_(qs.values(), (q) => q.shutdown)))
      )
    ),
    M.bindS('add', ({ queuesRef }) => {
      return pipe(
        M.do,
        M.bindS('queuesLock', () => I.toManaged_(Semaphore.make(1))),
        M.bindS('newQueue', () =>
          pipe(
            Ref.make<I.UIO<readonly [symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>]>>(
              pipe(
                I.do,
                I.bindS('queue', () => Queue.makeBounded<Ex.Exit<O.Option<E>, O>>(maximumLag)),
                I.letS('id', () => Symbol()),
                I.tap(({ queue, id }) => Ref.update_(queuesRef, Map.insert(id, queue))),
                I.map(({ id, queue }) => [id, queue])
              )
            ),
            I.toManaged()
          )
        ),
        M.letS('finalize', ({ queuesLock, newQueue }) => {
          return (endTake: Ex.Exit<O.Option<E>, never>) =>
            Semaphore.withPermit(queuesLock)(
              I.flatMap_(
                newQueue.set(
                  pipe(
                    I.do,
                    I.bindS('queue', () => Queue.makeBounded<Ex.Exit<O.Option<E>, O>>(1)),
                    I.tap(({ queue }) => queue.offer(endTake)),
                    I.letS('id', () => Symbol()),
                    I.tap(({ id, queue }) => Ref.update_(queuesRef, Map.insert(id, queue))),
                    I.map(({ id, queue }) => [id, queue] as const)
                  )
                ),
                () =>
                  pipe(
                    I.do,
                    I.bindS('queues', () => I.map_(queuesRef.get, (m) => [...m.values()])),
                    I.tap(({ queues }) =>
                      I.foreach_(queues, (queue) =>
                        pipe(
                          queue.offer(endTake),
                          I.catchSomeCause((c) => (Ca.interrupted(c) ? O.some(I.unit()) : O.none<I.UIO<void>>()))
                        )
                      )
                    ),
                    I.tap(() => done(endTake)),
                    I.asUnit
                  )
              )
            )
        }),
        M.tap(({ finalize }) =>
          pipe(
            stream,
            foreachManaged(offer(queuesRef)),
            M.foldCauseM(
              (cause) => I.toManaged_(finalize(Ex.failure(Ca.map_(cause, O.some)))),
              () => I.toManaged_(finalize(Ex.fail(O.none())))
            ),
            M.fork
          )
        ),
        M.map(({ queuesLock, newQueue }) => Semaphore.withPermit(queuesLock)(I.flatten(newQueue.get)))
      )
    }),
    M.map(({ add }) => add)
  )
}
