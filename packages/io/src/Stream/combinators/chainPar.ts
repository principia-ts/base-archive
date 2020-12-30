import type * as C from '../../Cause'
import type { Chunk } from '../../Chunk'

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

export function chainPar_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (o: O) => Stream<R1, E1, O1>,
  n: number,
  outputBuffer = 16
) {
  return new Stream(
    M.withChildren((getChildren) =>
      pipe(
        M.do,
        M.bindS('out', () =>
          T.toManaged_(Q.makeBounded<T.IO<R1, O.Option<E | E1>, Chunk<O1>>>(outputBuffer), (q) => q.shutdown)
        ),
        M.bindS('permits', () => T.toManaged_(SM.make(n))),
        M.bindS('innerFailure', () => T.toManaged_(P.make<C.Cause<E1>, never>())),
        M.tap(({ innerFailure, out, permits }) =>
          pipe(
            foreachManaged_(ma, (a) =>
              pipe(
                T.do,
                T.bindS('latch', () => P.make<never, void>()),
                T.letS('innerStream', ({ latch }) =>
                  pipe(
                    managed(SM.withPermitManaged(permits)),
                    tap((_) => P.succeed_(latch, undefined)),
                    chain((_) => f(a)),
                    foreachChunk((b) => T.asUnit(out.offer(T.succeed(b)))),
                    T.foldCauseM(
                      (cause) => T.asUnit(T.andThen_(out.offer(Pull.halt(cause)), P.fail_(innerFailure, cause))),
                      (_) => T.unit()
                    )
                  )
                ),
                T.tap(({ innerStream }) => T.fork(innerStream)),
                T.tap(({ latch }) => P.await(latch)),
                T.asUnit
              )
            ),
            M.foldCauseM(
              (cause) =>
                T.toManaged_(
                  T.andThen_(
                    T.flatMap_(getChildren, (c) => F.interruptAll(c)),
                    T.asUnit(out.offer(Pull.halt(cause)))
                  )
                ),
              (_) =>
                pipe(
                  P.await(innerFailure),
                  T.makeInterruptible,
                  T.raceWith(
                    SM.withPermits(n, permits)(T.makeInterruptible(T.unit())),
                    (_, permitsAcquisition) =>
                      T.andThen_(
                        T.flatMap_(getChildren, (c) => F.interruptAll(c)),
                        T.asUnit(F.interrupt(permitsAcquisition))
                      ),
                    (_, failureAwait) => T.andThen_(out.offer(Pull.end), T.asUnit(F.interrupt(failureAwait)))
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
