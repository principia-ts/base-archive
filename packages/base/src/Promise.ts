import type { Cause } from './Cause'
import type { Exit } from './Exit'
import type { FiberId } from './Fiber/FiberId'
import type { FIO } from './IO/core'
import type { Option } from './Option'

import * as E from './Either'
import {
  effectAsyncInterruptEither,
  interruptAs as interruptAsIO,
  uninterruptibleMask
} from './IO/combinators/interrupt'
import * as I from './IO/core'
import * as O from './Option'
import * as P from './prelude'
import { AtomicReference } from './util/support/AtomicReference'

export class Promise<E, A> {
  constructor(readonly state: AtomicReference<State<E, A>>, readonly blockingOn: ReadonlyArray<FiberId>) {
    this.fulfillWith = this.fulfillWith.bind(this)
    this.fulfill     = this.fulfill.bind(this)
    this.done        = this.done.bind(this)
    this.die         = this.die.bind(this)
    this.fail        = this.fail.bind(this)
    this.halt        = this.halt.bind(this)
    this.succeed     = this.succeed.bind(this)
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
   * `Promise.fulfill`.
   */
  fulfillWith(io: FIO<E, A>): I.UIO<boolean> {
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
  fulfill<R>(effect: I.IO<R, E, A>): I.URIO<R, boolean> {
    return uninterruptibleMask(({ restore }) => I.bind_(I.result(restore(effect)), this.done))
  }

  /**
   * Exits the promise with the specified exit, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  done(ex: Exit<E, A>): I.UIO<boolean> {
    return this.fulfillWith(I.done(ex))
  }

  /**
   * Kills the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  die(defect: unknown): I.UIO<boolean> {
    return this.fulfillWith(I.die(defect))
  }

  /**
   * Fails the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  fail(e: E): I.UIO<boolean> {
    return this.fulfillWith(I.fail(e))
  }

  /**
   * Halts the promise with the specified cause, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  halt(e: Cause<E>): I.UIO<boolean> {
    return this.fulfill(I.halt(e))
  }

  /**
   * Completes the promise with interruption. This will interrupt all fibers
   * waiting on the value of the promise as by the fiber calling this method.
   */
  get interrupt(): I.UIO<boolean> {
    return P.pipe(
      I.fiberId(),
      I.bind((id) => this.fulfillWith(interruptAsIO(id)))
    )
  }

  /**
   * Completes the promise with interruption. This will interrupt all fibers
   * waiting on the value of the promise as by the specified fiber.
   */
  interruptAs(id: FiberId): I.UIO<boolean> {
    return this.fulfillWith(interruptAsIO(id))
  }

  private interruptJoiner(joiner: (a: FIO<E, A>) => void): I.Canceler<unknown> {
    return I.effectTotal(() => {
      const state = this.state.get
      if (state._tag === 'Pending') {
        this.state.set(new Pending(state.joiners.filter((j) => j !== joiner)))
      }
    })
  }

  /**
   * Retrieves the value of the promise, suspending the fiber running the action
   * until the result is available.
   */
  get await() {
    return effectAsyncInterruptEither<unknown, E, A>((k) => {
      const state = this.state.get
      switch (state._tag) {
        case 'Done': {
          return E.right(state.value)
        }
        case 'Pending': {
          this.state.set(new Pending([k, ...state.joiners]))
          return E.left(this.interruptJoiner(k))
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
          return O.some(state.value)
        }
        case 'Pending': {
          return O.none()
        }
      }
    })
  }

  /**
   * Completes the promise with the specified value.
   */
  succeed(a: A): I.UIO<boolean> {
    return this.fulfillWith(I.succeed(a))
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
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export function fulfill_<R, E, A>(promise: Promise<E, A>, io: I.IO<R, E, A>): I.IO<R, never, boolean> {
  return promise.fulfill(io)
}

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @dataFirst fulfill_
 */
export function fulfill<R, E, A>(io: I.IO<R, E, A>): (promise: Promise<E, A>) => I.IO<R, never, boolean> {
  return (promise) => promise.fulfill(io)
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
export function fulfillWith_<E, A>(promise: Promise<E, A>, io: FIO<E, A>): I.UIO<boolean> {
  return promise.fulfillWith(io)
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
 *
 * @dataFirst fulfillWith_
 */
export function fulfillWith<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>): I.UIO<boolean> => promise.fulfillWith(io)
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function die_<E, A>(promise: Promise<E, A>, defect: unknown): I.UIO<boolean> {
  return promise.die(defect)
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst die_
 */
export function die(e: Error) {
  return <E, A>(promise: Promise<E, A>) => promise.die(e)
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done_<E, A>(promise: Promise<E, A>, exit: Exit<E, A>): I.UIO<boolean> {
  return promise.done(exit)
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst done_
 */
export function done<E, A>(exit: Exit<E, A>): (promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => promise.done(exit)
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function fail_<E, A>(promise: Promise<E, A>, e: E): I.UIO<boolean> {
  return promise.fail(e)
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst fail_
 */
export function fail<E>(e: E): <A>(promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => promise.fail(e)
}

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt_<E, A>(promise: Promise<E, A>, cause: Cause<E>): I.UIO<boolean> {
  return promise.halt(cause)
}

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst halt_
 */
export function halt<E>(cause: Cause<E>): <A>(promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => promise.halt(cause)
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
export function interruptAs_<E, A>(promise: Promise<E, A>, id: FiberId): I.UIO<boolean> {
  return promise.interruptAs(id)
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 *
 * @dataFirst interruptAs_
 */
export function interruptAs(id: FiberId): <E, A>(promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => promise.interruptAs(id)
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
export function promise<E, A>() {
  return I.bind_(I.fiberId(), (id) => promiseAs<E, A>(id))
}

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export function promiseAs<E, A>(fiberId: FiberId) {
  return I.effectTotal(() => unsafePromise<E, A>(fiberId))
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
export function succeed_<A, E>(promise: Promise<E, A>, a: A) {
  return promise.succeed(a)
}

/**
 * Completes the promise with the specified value.
 *
 * @dataFirst succeed_
 */
export function succeed<A>(a: A) {
  return <E>(promise: Promise<E, A>) => promise.succeed(a)
}

/**
 * Unsafe version of done
 */
export function unsafeDone<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>) => promise.unsafeDone(io)
}

export function unsafePromise<E, A>(fiberId: FiberId) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId])
}

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(promise: Promise<E, A>): I.IO<unknown, E, A> {
  return promise.await
}

export { wait as await }
