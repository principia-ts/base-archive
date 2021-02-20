import type { Cause } from './Cause'
import type { Exit } from './Exit'
import type { FiberId } from './Fiber/FiberId'
import type { FIO } from './IO/core'
import type { Option } from '@principia/base/Option'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import { AtomicReference } from '@principia/base/util/support/AtomicReference'

import { fiberId } from './IO/combinators/fiberId'
import {
  effectAsyncInterruptEither,
  interruptAs as interruptAsIO,
  uninterruptibleMask
} from './IO/combinators/interrupt'
import * as I from './IO/core'

export class Promise<E, A> {
  constructor(readonly state: AtomicReference<State<E, A>>, readonly blockingOn: ReadonlyArray<FiberId>) {}

  /**
   * Completes the promise with the specified effect. If the promise has
   * already been completed, the method will produce false.
   *
   * Note that since the promise is completed with an IO, the effect will
   * be evaluated each time the value of the promise is retrieved through
   * combinators such as `wait`, potentially producing different results if
   * the effect produces different results on subsequent evaluations. In this
   * case te meaning of the "exactly once" guarantee of `Promise` is that the
   * promise can be completed with exactly one effect. For a version that
   * completes the promise with the result of an IO see
   * `Promise.complete`.
   */
  completeWith(io: FIO<E, A>): I.UIO<boolean> {
    return I.effectTotal(() => {
      const state = this.state.get
      switch (state._tag) {
        case 'Done': {
          return false
        }
        case 'Pending': {
          this.state.set(new Done(io))
          state.joiners.forEach((f) => {
            f(io)
          })
          return true
        }
      }
    })
  }

  /**
   * Completes the promise with the result of the specified effect. If the
   * promise has already been completed, the method will produce false.
   *
   * Note that `Promise.completeWith` will be much faster, so consider using
   * that if you do not need to memoize the result of the specified effect.
   */
  complete(effect: FIO<E, A>): I.UIO<boolean> {
    return to(this)(effect)
  }

  /**
   * Exits the promise with the specified exit, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  done(ex: Exit<E, A>): I.UIO<boolean> {
    return this.completeWith(I.done(ex))
  }

  /**
   * Kills the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  die(e: Error): I.UIO<boolean> {
    return this.completeWith(I.die(e))
  }

  /**
   * Fails the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  fail(e: E): I.UIO<boolean> {
    return this.completeWith(I.fail(e))
  }

  /**
   * Halts the promise with the specified cause, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  halt(e: Cause<E>): I.UIO<boolean> {
    return this.complete(I.halt(e))
  }

  /**
   * Completes the promise with interruption. This will interrupt all fibers
   * waiting on the value of the promise as by the fiber calling this method.
   */
  get interrupt(): I.UIO<boolean> {
    return pipe(
      fiberId(),
      I.bind((id) => this.completeWith(interruptAsIO(id)))
    )
  }

  /**
   * Completes the promise with interruption. This will interrupt all fibers
   * waiting on the value of the promise as by the specified fiber.
   */
  interruptAs(id: FiberId): I.UIO<boolean> {
    return this.completeWith(interruptAsIO(id))
  }

  private interruptJoiner = (joiner: (a: FIO<E, A>) => void): I.Canceler<unknown> =>
    I.effectTotal(() => {
      const state = this.state.get
      if (state._tag === 'Pending') {
        this.state.set(new Pending(state.joiners.filter((j) => j !== joiner)))
      }
    })

  /**
   * Retrieves the value of the promise, suspending the fiber running the action
   * until the result is available.
   */
  get await() {
    return effectAsyncInterruptEither<unknown, E, A>((k) => {
      const state = this.state.get
      switch (state._tag) {
        case 'Done': {
          return E.Right(state.value)
        }
        case 'Pending': {
          this.state.set(new Pending([k, ...state.joiners]))
          return E.Left(this.interruptJoiner(k))
        }
      }
    }, this.blockingOn)
  }

  /**
   * Checks for completion of this Promise. Produces true if this promise has
   * already been completed with a value or an error and false otherwise.
   */
  get isDone(): I.UIO<boolean> {
    return I.effectTotal(() => this.state.get._tag === 'Done')
  }

  /**
   * Checks for completion of this Promise. Returns the result effect if this
   * promise has already been completed or a `None` otherwise.
   */
  get poll(): I.UIO<Option<FIO<E, A>>> {
    return I.effectTotal(() => {
      const state = this.state.get

      switch (state._tag) {
        case 'Done': {
          return O.Some(state.value)
        }
        case 'Pending': {
          return O.None()
        }
      }
    })
  }

  /**
   * Completes the promise with the specified value.
   */
  succeed(a: A): I.UIO<boolean> {
    return this.completeWith(I.succeed(a))
  }

  /**
   * Unsafe version of done
   */
  unsafeDone(io: FIO<E, A>) {
    const state = this.state.get
    if (state._tag === 'Pending') {
      this.state.set(new Done(io))
      Array.from(state.joiners)
        .reverse()
        .forEach((f) => {
          f(io)
        })
    }
  }
}

export const URI = 'Promise'

export type URI = typeof URI

export type State<E, A> = Done<E, A> | Pending<E, A>

export class Done<E, A> {
  readonly _tag = 'Done'
  constructor(readonly value: FIO<E, A>) {}
}

export class Pending<E, A> {
  readonly _tag = 'Pending'
  constructor(readonly joiners: ReadonlyArray<(_: FIO<E, A>) => void>) {}
}

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: Promise<E, A>) {
  return <R>(effect: I.IO<R, E, A>): I.IO<R, never, boolean> =>
    uninterruptibleMask(({ restore }) => I.bind_(I.result(restore(effect)), (x) => p.done(x)))
}

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(promise: Promise<E, A>): I.IO<unknown, E, A> {
  return promise.await
}

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export function complete<E, A>(e: FIO<E, A>) {
  return (promise: Promise<E, A>) => promise.complete(e)
}

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an IO, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an IO see
 * `Promise.complete`.
 */
export function completeWith<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>): I.UIO<boolean> => promise.completeWith(io)
}

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an IO, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an IO see
 * `Promise.complete`.
 */
export function completeWith_<E, A>(promise: Promise<E, A>, io: FIO<E, A>): I.UIO<boolean> {
  return promise.completeWith(io)
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function die(e: Error) {
  return <E, A>(promise: Promise<E, A>) => promise.die(e)
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done<E, A>(e: Exit<E, A>) {
  return (promise: Promise<E, A>): I.UIO<boolean> => promise.done(e)
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function fail<E>(e: E) {
  return <A>(promise: Promise<E, A>): I.UIO<boolean> => promise.fail(e)
}

export function fail_<E, A>(promise: Promise<E, A>, e: E): I.UIO<boolean> {
  return promise.fail(e)
}

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt<E>(e: Cause<E>) {
  return <A>(promise: Promise<E, A>): I.UIO<boolean> => promise.halt(e)
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: Promise<E, A>): I.UIO<boolean> {
  return promise.interrupt
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export function interruptAs(id: FiberId) {
  return <E, A>(promise: Promise<E, A>): I.UIO<boolean> => promise.interruptAs(id)
}

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(promise: Promise<E, A>): I.UIO<boolean> {
  return promise.isDone
}

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return I.bind_(fiberId(), (id) => makeAs<E, A>(id))
}

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export function makeAs<E, A>(fiberId: FiberId) {
  return I.effectTotal(() => unsafeMake<E, A>(fiberId))
}

export function unsafeMake<E, A>(fiberId: FiberId) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId])
}

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export function poll<E, A>(promise: Promise<E, A>): I.UIO<Option<FIO<E, A>>> {
  return promise.poll
}

/**
 * Completes the promise with the specified value.
 */
export function succeed<A>(a: A) {
  return <E>(promise: Promise<E, A>) => promise.succeed(a)
}

/**
 * Completes the promise with the specified value.
 */
export function succeed_<A, E>(promise: Promise<E, A>, a: A) {
  return promise.succeed(a)
}

/**
 * Unsafe version of done
 */
export function unsafeDone<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>) => promise.unsafeDone(io)
}

export { wait as await }
