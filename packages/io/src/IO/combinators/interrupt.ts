import type { InterruptStatus } from '../../Fiber/core'
import type { FiberId } from '../../Fiber/FiberId'
import type { Canceler, FIO, IO, UIO } from '../core'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'

import { Left } from '@principia/base/Either'
import { flow, pipe } from '@principia/base/Function'
import { None, Some } from '@principia/base/Option'
import { AtomicReference } from '@principia/base/util/support/AtomicReference'
import { OneShot } from '@principia/base/util/support/OneShot'

import * as C from '../../Cause/core'
import { join } from '../../Fiber/combinators/join'
import { interruptible, uninterruptible } from '../../Fiber/core'
import {
  bind,
  bind_,
  checkInterruptible,
  deferTotal,
  die,
  effectAsync,
  effectAsyncOption,
  effectTotal,
  fiberId,
  flatten,
  halt,
  matchCauseM_,
  pure,
  SetInterrupt,
  unit
} from '../core'
import { forkDaemon } from './core-scope'

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberId): FIO<never, never> {
  return halt(C.interrupt(fiberId))
}

/**
 * Returns an effect that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: IO<unknown, never, never> = bind_(fiberId(), interruptAs)

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function setInterruptStatus_<R, E, A>(effect: IO<R, E, A>, flag: InterruptStatus): IO<R, E, A> {
  return new SetInterrupt(effect, flag)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function setInterruptStatus(flag: InterruptStatus): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => setInterruptStatus_(ma, flag)
}

/**
 * Returns a new effect that performs the same operations as this effect, but
 * interruptibly, even if composed inside of an uninterruptible region.
 *
 * Note that effects are interruptible by default, so this function only has
 * meaning if used within an uninterruptible region.
 *
 * WARNING: This operator "punches holes" into effects, allowing them to be
 * interrupted in unexpected places. Do not use this operator unless you know
 * exactly what you are doing. Instead, you should use `uninterruptibleMask`.
 */
export function makeInterruptible<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return setInterruptStatus_(ma, interruptible)
}

/**
 * Performs this effect uninterruptibly. This will prevent the effect from
 * being terminated externally, but the effect may fail for internal reasons
 * (e.g. an uncaught error) or terminate due to defect.
 *
 * Uninterruptible effects may recover from all failure causes (including
 * interruption of an inner effect that has been made interruptible).
 */
export function makeUninterruptible<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return setInterruptStatus_(ma, uninterruptible)
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export function uninterruptibleMask<R, E, A>(f: (restore: InterruptStatusRestore) => IO<R, E, A>): IO<R, E, A> {
  return checkInterruptible((flag) => makeUninterruptible(f(new InterruptStatusRestore(flag))))
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export function onInterrupt_<R, E, A, R1>(
  ma: IO<R, E, A>,
  cleanup: (interruptors: ReadonlySet<FiberId>) => IO<R1, never, any>
): IO<R & R1, E, A> {
  return uninterruptibleMask(({ restore }) =>
    matchCauseM_(
      restore(ma),
      (cause) => (C.interrupted(cause) ? bind_(cleanup(C.interruptors(cause)), () => halt(cause)) : halt(cause)),
      pure
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export function onInterrupt<R1>(
  cleanup: (interruptors: ReadonlySet<FiberId>) => IO<R1, never, any>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E, A> {
  return (ma) => onInterrupt_(ma, cleanup)
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export function onInterruptExtended_<R, E, A, R2, E2>(
  self: IO<R, E, A>,
  cleanup: () => IO<R2, E2, any>
): IO<R & R2, E | E2, A> {
  return uninterruptibleMask(({ restore }) =>
    matchCauseM_(
      restore(self),
      (cause) =>
        C.interrupted(cause)
          ? matchCauseM_(
              cleanup(),
              (_) => halt(_),
              () => halt(cause)
            )
          : halt(cause),
      pure
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export function onInterruptExtended<R2, E2>(
  cleanup: () => IO<R2, E2, any>
): <R, E, A>(self: IO<R, E, A>) => IO<R & R2, E | E2, A> {
  return (self) => onInterruptExtended_(self, cleanup)
}

/**
 * Returns an IO whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 */
export function disconnect<R, E, A>(effect: IO<R, E, A>): IO<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    bind_(fiberId(), (id) =>
      bind_(forkDaemon(restore(effect)), (fiber) =>
        onInterrupt_(restore(join(fiber)), () => forkDaemon(fiber.interruptAs(id)))
      )
    )
  )
}

/**
 * Used to restore the inherited interruptibility
 */
export class InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {}

  restore = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => setInterruptStatus_(ma, this.flag)

  force = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => {
    if (this.flag.isUninteruptible) {
      return makeInterruptible(disconnect(makeUninterruptible(ma)))
    }
    return setInterruptStatus_(ma, this.flag)
  }
}

/**
 * Imports an asynchronous side-effect into an IO. The side-effect
 * has the option of returning the value synchronously, which is useful in
 * cases where it cannot be determined if the effect is synchronous or
 * asynchronous until the side-effect is actually executed. The effect also
 * has the option of returning a canceler, which will be used by the runtime
 * to cancel the asynchronous effect if the fiber executing the effect is
 * interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called
 * at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsyncInterruptEither<R, E, A>(
  register: (cb: (resolve: IO<R, E, A>) => void) => Either<Canceler<R>, IO<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return pipe(
    effectTotal(() => [new AtomicReference(false), new OneShot<Canceler<R>>()] as const),
    bind(([started, cancel]) =>
      pipe(
        effectAsyncOption<R, E, IO<R, E, A>>((k) => {
          started.set(true)
          const ret = new AtomicReference<Option<UIO<IO<R, E, A>>>>(None())
          try {
            const res = register((io) => k(pure(io)))
            switch (res._tag) {
              case 'Right': {
                ret.set(Some(pure(res.right)))
                break
              }
              case 'Left': {
                cancel.set(res.left)
                break
              }
            }
          } finally {
            if (!cancel.isSet()) {
              cancel.set(unit())
            }
          }
          return ret.get
        }, blockingOn),
        flatten,
        onInterrupt(() => deferTotal(() => (started.get ? cancel.get() : unit())))
      )
    )
  )
}

export function effectAsyncInterrupt<R, E, A>(
  register: (cb: (_: IO<R, E, A>) => void) => Canceler<R>,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return effectAsyncInterruptEither<R, E, A>((cb) => Left(register(cb)), blockingOn)
}

export function effectAsyncInterruptPromise<R, E, A>(
  register: (cb: (_: IO<R, E, A>) => void) => Promise<Canceler<R>>,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return effectAsyncInterruptEither<R, E, A>(
    (cb) => Left(pipe(register(cb), (p) => fromPromiseDie(() => p), flatten)),
    blockingOn
  )
}

function fromPromiseDie<A>(promise: () => Promise<A>): UIO<A> {
  return effectAsync((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve))
  })
}
