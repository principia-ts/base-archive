import type * as C from '../../Cause'
import type * as A from '../../Chunk'

import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as F from '../../Fiber'
import * as T from '../../IO'
import * as M from '../../Managed'
import * as P from '../../Promise'
import * as Q from '../../Queue'
import * as SM from '../../Semaphore'
import { chain, foreachChunk, foreachManaged_, managed, Stream, tap } from '../core'
import * as Pull from '../Pull'

/**
 * Maps each element of this stream to another stream and returns the non-deterministic merge
 * of those streams, executing up to `n` inner streams concurrently. When a new stream is created
 * from an element of the source stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this operator.
 */
export function chainParSwitch_(n: number, bufferSize = 16) {
  return <R, E, O, R1, E1, O2>(ma: Stream<R, E, O>, f: (o: O) => Stream<R1, E1, O2>): Stream<R & R1, E | E1, O2> => {
    return new Stream(
      M.withChildren((getChildren) =>
        pipe(
          M.do,
          M.bindS('out', () =>
            T.toManaged_(Q.makeBounded<T.IO<R1, O.Option<E | E1>, A.Chunk<O2>>>(bufferSize), (q) => q.shutdown)
          ),
          M.bindS('permits', () => T.toManaged_(SM.make(n))),
          M.bindS('innerFailure', () => T.toManaged_(P.make<C.Cause<E1>, never>())),
          M.bindS('cancelers', () => T.toManaged_(Q.makeBounded<P.Promise<never, void>>(n), (q) => q.shutdown)),
          M.tap(({ cancelers, innerFailure, out, permits }) =>
            pipe(
              foreachManaged_(ma, (a) =>
                pipe(
                  T.do,
                  T.bindS('canceler', () => P.make<never, void>()),
                  T.bindS('latch', () => P.make<never, void>()),
                  T.bindS('size', () => cancelers.size),
                  T.tap(({ size }) => {
                    if (size < n) {
                      return T.unit()
                    } else {
                      return pipe(
                        cancelers.take,
                        T.flatMap((_) => T.succeed(undefined)),
                        T.asUnit
                      )
                    }
                  }),
                  T.tap(({ canceler }) => cancelers.offer(canceler)),
                  T.letS('innerStream', ({ latch }) =>
                    pipe(
                      managed(SM.withPermitManaged(permits)),
                      tap((_) => P.succeed_(latch, undefined)),
                      chain((_) => f(a)),
                      foreachChunk((o2s) => T.asUnit(out.offer(T.succeed(o2s)))),
                      T.foldCauseM(
                        (cause) => pipe(out.offer(Pull.halt(cause)), T.andThen(P.fail_(innerFailure, cause)), T.asUnit),
                        (_) => T.unit()
                      )
                    )
                  ),
                  T.tap(({ canceler, innerStream }) => T.fork(T.race_(innerStream, P.await(canceler)))),
                  T.tap(({ latch }) => P.await(latch)),
                  T.asUnit
                )
              ),
              M.foldCauseM(
                (cause) =>
                  pipe(
                    pipe(
                      getChildren,
                      T.flatMap((_) => F.interruptAll(_)),
                      T.andThen(out.offer(Pull.halt(cause)))
                    ),
                    T.asUnit,
                    T.toManaged()
                  ),
                (_) =>
                  pipe(
                    P.await(innerFailure),
                    T.raceWith(
                      SM.withPermits(n, permits)(T.unit()),
                      (_, permitAcquisition) =>
                        pipe(
                          getChildren,
                          T.flatMap(F.interruptAll),
                          T.andThen(T.asUnit(F.interrupt(permitAcquisition)))
                        ),
                      (_, failureAwait) => pipe(out.offer(Pull.end), T.andThen(T.asUnit(F.interrupt(failureAwait))))
                    ),
                    T.toManaged()
                  )
              ),
              M.fork
            )
          ),
          M.map(({ out }) => T.flatten(out.take))
        )
      )
    )
  }
}

/**
 * Maps each element of this stream to another stream and returns the non-deterministic merge
 * of those streams, executing up to `n` inner streams concurrently. When a new stream is created
 * from an element of the source stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this operator.
 */
export function chainParSwitch(n: number, bufferSize = 16) {
  return <O, R1, E1, O2>(f: (o: O) => Stream<R1, E1, O2>) => <R, E>(ma: Stream<R, E, O>): Stream<R & R1, E | E1, O2> =>
    chainParSwitch_(n, bufferSize)(ma, f)
}
