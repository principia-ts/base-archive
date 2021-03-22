import type { Exit } from '../../Exit'
import type { IO, UIO } from '../core'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/function'
import { tuple } from '@principia/base/tuple'

import * as Ex from '../../Exit'
import * as Fiber from '../../Fiber'
import * as XR from '../../IORef'
import * as P from '../../Promise'
import * as I from '../core'
import { makeInterruptible, onInterrupt, uninterruptibleMask } from './interrupt'

const arbiter = <E, A>(
  fibers: ReadonlyArray<Fiber.Fiber<E, A>>,
  winner: Fiber.Fiber<E, A>,
  promise: P.Promise<E, readonly [A, Fiber.Fiber<E, A>]>,
  fails: XR.URef<number>
) => (res: Exit<E, A>): UIO<void> =>
  Ex.matchM_(
    res,
    (e) =>
      pipe(
        fails,
        XR.modify((c) => tuple(c === 0 ? pipe(promise.halt(e), I.asUnit) : I.unit(), c - 1)),
        I.flatten
      ),
    (a) =>
      pipe(
        promise.succeed(tuple(a, winner)),
        I.bind((set) =>
          set
            ? A.foldl_(fibers, I.unit(), (io, f) => (f === winner ? io : I.tap_(io, () => Fiber.interrupt(f))))
            : I.unit()
        )
      )
  )

/**
 * Returns an IO that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value.
 * Losers of the race will be interrupted immediately.
 *
 * Note: in case of success eventual interruption errors are ignored
 */
export function raceAll<R, E, A>(
  ios: NonEmptyArray<IO<R, E, A>>,
  interruptStrategy: 'background' | 'wait' = 'background'
): IO<R, E, A> {
  return I.gen(function* (_) {
    const done    = yield* _(P.make<E, readonly [A, Fiber.Fiber<E, A>]>())
    const fails   = yield* _(XR.make(ios.length))
    const [c, fs] = yield* _(
      uninterruptibleMask(({ restore }) =>
        I.gen(function* (_) {
          const fs = yield* _(I.foreach_(ios, flow(makeInterruptible, I.fork)))
          yield* _(
            A.foldl_(fs, I.unit(), (io, f) =>
              I.bind_(io, () => pipe(f.await, I.bind(arbiter(fs, f, done, fails)), I.fork, I.asUnit))
            )
          )
          const inheritRefs = (res: readonly [A, Fiber.Fiber<E, A>]) =>
            pipe(
              res[1].inheritRefs,
              I.as(() => res[0])
            )
          const c           = yield* _(
            pipe(
              done.await,
              I.bind(inheritRefs),
              restore,
              onInterrupt(() => A.foldl_(fs, I.unit(), (io, f) => I.tap_(io, () => Fiber.interrupt(f))))
            )
          )
          return tuple(c, fs)
        })
      )
    )
    yield* _(interruptStrategy === 'wait' ? I.asUnit(I.foreach_(fs, (f) => f.await)) : I.unit())
    return c
  })
}
