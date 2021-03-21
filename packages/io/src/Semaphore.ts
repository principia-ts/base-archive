import type { URef } from './IORef/core'
import type { Promise } from './Promise'
import type { Either } from '@principia/base/Either'

import * as E from '@principia/base/Either'
import { IllegalArgumentError } from '@principia/base/Error'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { ImmutableQueue } from '@principia/base/util/support/ImmutableQueue'

import { bracket_ } from './IO/combinators/bracket'
import * as I from './IO/core'
import * as XR from './IORef/core'
import * as M from './Managed/core'
import * as P from './Promise'

export type Entry = [Promise<never, void>, number]
export type State = Either<ImmutableQueue<Entry>, number>

export class Acquisition {
  constructor(readonly waitAcquire: I.UIO<void>, readonly release: I.UIO<void>) {}
}

/**
 * An asynchronous semaphore, which is a generalization of a mutex. Semaphores
 * have a certain number of permits, which can be held and released
 * concurrently by different parties. Attempts to acquire more permits than
 * available result in the acquiring fiber being suspended until the specified
 * number of permits become available.
 **/
export class Semaphore {
  constructor(private readonly state: URef<State>) {
    this.loop     = this.loop.bind(this)
    this.restore  = this.restore.bind(this)
    this.releaseN = this.releaseN.bind(this)
    this.restore  = this.restore.bind(this)
  }

  get available() {
    return I.map_(
      this.state.get,
      E.getOrElse(() => 0)
    )
  }

  private loop(n: number, state: State, acc: I.UIO<void>): [I.UIO<void>, State] {
    switch (state._tag) {
      case 'Right': {
        return [acc, E.Right(n + state.right)]
      }
      case 'Left': {
        return O.match_(
          state.left.dequeue(),
          (): [I.UIO<void>, E.Either<ImmutableQueue<Entry>, number>] => [acc, E.Right(n)],
          ([[p, m], q]): [I.UIO<void>, E.Either<ImmutableQueue<Entry>, number>] => {
            if (n > m) {
              return this.loop(n - m, E.Left(q), I.apl_(acc, p.succeed(undefined)))
            } else if (n === m) {
              return [I.apl_(acc, p.succeed(undefined)), E.Left(q)]
            } else {
              return [acc, E.Left(q.prepend([p, m - n]))]
            }
          }
        )
      }
    }
  }

  private releaseN(toRelease: number): I.UIO<void> {
    return I.flatten(
      I.bind_(assertNonNegative(toRelease, 'Semaphore.releaseN'), () =>
        pipe(
          this.state,
          XR.modify((s) => this.loop(toRelease, s, I.unit()))
        )
      )
    )
  }

  private restore(p: Promise<never, void>, n: number): I.UIO<void> {
    return I.flatten(
      pipe(
        this.state,
        XR.modify(
          E.match(
            (q) =>
              O.match_(
                q.find(([a]) => a === p),
                (): [I.UIO<void>, E.Either<ImmutableQueue<Entry>, number>] => [this.releaseN(n), E.Left(q)],
                (x): [I.UIO<void>, E.Either<ImmutableQueue<Entry>, number>] => [
                  this.releaseN(n - x[1]),
                  E.Left(q.filter(([a]) => a != p))
                ]
              ),
            (m): [I.UIO<void>, E.Either<ImmutableQueue<Entry>, number>] => [I.unit(), E.Right(n + m)]
          )
        )
      )
    )
  }

  prepare(n: number) {
    if (n === 0) {
      return I.pure(new Acquisition(I.unit(), I.unit()))
    } else {
      return I.bind_(P.make<never, void>(), (p) =>
        pipe(
          this.state,
          XR.modify(
            E.match(
              (q): [Acquisition, E.Either<ImmutableQueue<Entry>, number>] => [
                new Acquisition(p.await, this.restore(p, n)),
                E.Left(q.push([p, n]))
              ],
              (m): [Acquisition, E.Either<ImmutableQueue<Entry>, number>] => {
                if (m >= n) {
                  return [new Acquisition(I.unit(), this.releaseN(n)), E.Right(m - n)]
                }
                return [new Acquisition(p.await, this.restore(p, n)), E.Left(new ImmutableQueue([[p, n - m]]))]
              }
            )
          )
        )
      )
    }
  }
}

/**
 * Acquires `n` permits, executes the action and releases the permits right after.
 */
export function withPermits_<R, E, A>(io: I.IO<R, E, A>, n: number, s: Semaphore): I.IO<R, E, A> {
  return bracket_(
    s.prepare(n),
    (a) => I.bind_(a.waitAcquire, () => io),
    (a) => a.release
  )
}

/**
 * Acquires `n` permits, executes the action and releases the permits right after.
 */
export function withPermits(n: number, s: Semaphore) {
  return <R, E, A>(io: I.IO<R, E, A>) => withPermits_(io, n, s)
}

/**
 * Acquires a permit, executes the action and releases the permit right after.
 */
export function withPermit_<R, E, A>(io: I.IO<R, E, A>, s: Semaphore): I.IO<R, E, A> {
  return withPermits_(io, 1, s)
}

/**
 * Acquires a permit, executes the action and releases the permit right after.
 */
export function withPermit(s: Semaphore): <R, E, A>(io: I.IO<R, E, A>) => I.IO<R, E, A> {
  return (io) => withPermit_(io, s)
}

/**
 * Acquires `n` permits in a `Managed` and releases the permits in the finalizer.
 */
export function withPermitsManaged(n: number): (s: Semaphore) => M.Managed<unknown, never, void> {
  return (s) => M.makeReserve(I.map_(s.prepare(n), (a) => M.makeReservation(() => a.release)(a.waitAcquire)))
}

/**
 * Acquires a permit in a `Managed` and releases the permit in the finalizer.
 */
export function withPermitManaged(s: Semaphore) {
  return withPermitsManaged(1)(s)
}

/**
 * The number of permits currently available.
 */
export function available(s: Semaphore): I.IO<unknown, never, number> {
  return s.available
}

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export function make(permits: number): I.IO<unknown, never, Semaphore> {
  return I.map_(XR.make<State>(E.Right(permits)), (state) => new Semaphore(state))
}

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export function unsafeMake(permits: number): Semaphore {
  const state = XR.unsafeMake<State>(E.Right(permits))

  return new Semaphore(state)
}

function assertNonNegative(n: number, fn: string) {
  return n < 0 ? I.die(new NegativeArgument(`Unexpected negative value ${n} passed to ${fn}.`, fn)) : I.unit()
}

class NegativeArgument extends IllegalArgumentError {
  constructor(message: string, fn: string) {
    super(message, fn)
  }
}
