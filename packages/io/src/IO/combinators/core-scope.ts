import type { Exit } from '../../Exit'
import type { Fiber, RuntimeFiber } from '../../Fiber/core'
import type { FiberContext } from '../../FiberContext'
import type { Scope } from '../../Scope'
import type { IO, UIO, URIO } from '../core'
import type { Option } from '@principia/base/Option'

import * as O from '@principia/base/Option'

import { globalScope } from '../../Scope'
import { Fork, GetForkScope, OverrideForkScope, pure, Race } from '../core'

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScope: UIO<Scope<Exit<any, any>>> = new GetForkScope(pure)

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export function forkScopeWith<R, E, A>(f: (_: Scope<Exit<any, any>>) => IO<R, E, A>) {
  return new GetForkScope(f)
}

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => new OverrideForkScope(ma, O.some(this.scope))
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 */
export function forkScopeMask(
  newScope: Scope<Exit<any, any>>
): <R, E, A>(f: (restore: ForkScopeRestore) => IO<R, E, A>) => GetForkScope<R, E, A> {
  return (f) =>
    forkScopeWith((scope) => new OverrideForkScope(f(new ForkScopeRestore(scope)), O.some(newScope)))
}

export function forkIn(scope: Scope<Exit<any, any>>): <R, E, A>(io: IO<R, E, A>) => URIO<R, RuntimeFiber<E, A>> {
  return (io) => new Fork(io, O.some(scope), O.none())
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export function raceWith_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: IO<R, E, A>,
  right: IO<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
  scope: Option<Scope<Exit<any, any>>> = O.none()
): IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new Race(left, right, leftWins, rightWins, scope)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export function raceWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  right: IO<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
  scope: Option<Scope<Exit<any, any>>> = O.none()
): <R>(left: IO<R, E, A>) => IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return (left) => new Race(left, right, leftWins, rightWins, scope)
}

export type Grafter = <R, E, A>(effect: IO<R, E, A>) => IO<R, E, A>

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the
 * fiber that executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level
 * scope, effectively extending their lifespans into the parent scope.
 */
export function transplant<R, E, A>(f: (_: Grafter) => IO<R, E, A>): IO<R, E, A> {
  return forkScopeWith((scope) => f((e) => new OverrideForkScope(e, O.some(scope))))
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemon<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  return new Fork(ma, O.some(globalScope), O.none())
}
