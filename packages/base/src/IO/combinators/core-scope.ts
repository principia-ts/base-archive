// tracing: off

import type { Exit } from '../../Exit'
import type { Fiber, RuntimeFiber } from '../../Fiber/core'
import type { FiberContext } from '../../internal/FiberContext'
import type { Option } from '../../Option'
import type { Scope } from '../../Scope'
import type { FailureReporter, IO, UIO, URIO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as O from '../../Option'
import { globalScope } from '../../Scope'
import { Fork, GetForkScope, OverrideForkScope, pure, Race } from '../core'

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScope: UIO<Scope<Exit<any, any>>> = new GetForkScope(pure)

/**
 * Retrieves the scope that will be used to supervise forked effects.
 *
 * @trace 0
 */
export function forkScopeWith<R, E, A>(f: (_: Scope<Exit<any, any>>) => IO<R, E, A>) {
  return new GetForkScope(f)
}

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => new OverrideForkScope(ma, O.Some(this.scope))
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 *
 * @trace 1
 */
export function forkScopeMask_<R, E, A>(
  newScope: Scope<Exit<any, any>>,
  f: (restore: ForkScopeRestore) => IO<R, E, A>
): IO<R, E, A> {
  return forkScopeWith(traceAs(f, (scope) => new OverrideForkScope(f(new ForkScopeRestore(scope)), O.Some(newScope))))
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 *
 * @dataFirst forkScopeMask_
 * @trace 0
 */
export function forkScopeMask<R, E, A>(
  f: (restore: ForkScopeRestore) => IO<R, E, A>
): (newScope: Scope<Exit<any, any>>) => IO<R, E, A> {
  return (newScope) => forkScopeMask_(newScope, f)
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 */
export function forkIn_<R, E, A>(io: IO<R, E, A>, scope: Scope<Exit<any, any>>): URIO<R, RuntimeFiber<E, A>> {
  return new Fork(io, O.Some(scope), O.None())
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 *
 * @dataFirst forkIn_
 */
export function forkIn(scope: Scope<Exit<any, any>>): <R, E, A>(io: IO<R, E, A>) => URIO<R, RuntimeFiber<E, A>> {
  return (io) => forkIn_(io, scope)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @trace 2
 * @trace 3
 */
export function raceWith_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: IO<R, E, A>,
  right: IO<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
  scope: Option<Scope<Exit<any, any>>> = O.None()
): IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new Race(left, right, leftWins, rightWins, scope)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @dataFirst raceWith_
 * @trace 1
 * @trace 2
 */
export function raceWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  right: IO<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
  scope: Option<Scope<Exit<any, any>>> = O.None()
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
 *
 * @trace 0
 */
export function transplant<R, E, A>(f: (_: Grafter) => IO<R, E, A>): IO<R, E, A> {
  return forkScopeWith((scope) => f((e) => new OverrideForkScope(e, O.Some(scope))))
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemon<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  return new Fork(ma, O.Some(globalScope), O.None())
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemonReport_<R, E, A>(
  ma: IO<R, E, A>,
  reportFailure: FailureReporter
): URIO<R, FiberContext<E, A>> {
  return new Fork(ma, O.Some(globalScope), O.Some(reportFailure))
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @dataFirst forkDaemonReport_
 */
export function forkDaemonReport(
  reportFailure: FailureReporter
): <R, E, A>(ma: IO<R, E, A>) => URIO<R, FiberContext<E, A>> {
  return (ma) => forkDaemonReport_(ma, reportFailure)
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 */
export function forkInReport_<R, E, A>(
  ma: IO<R, E, A>,
  scope: Scope<Exit<any, any>>,
  reportFailure: FailureReporter
): URIO<R, RuntimeFiber<E, A>> {
  return new Fork(ma, O.Some(scope), O.Some(reportFailure))
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 */
export function forkInReport(
  scope: Scope<Exit<any, any>>,
  reportFailure: FailureReporter
): <R, E, A>(ma: IO<R, E, A>) => URIO<R, RuntimeFiber<E, A>> {
  return (ma) => forkInReport_(ma, scope, reportFailure)
}

/**
 * Returns a new effect that will utilize the specified scope to supervise
 * any fibers forked within the original effect.
 */
export function overrideForkScope_<R, E, A>(ma: IO<R, E, A>, scope: Scope<Exit<any, any>>): IO<R, E, A> {
  return new OverrideForkScope(ma, O.Some(scope))
}

/**
 * Returns a new effect that will utilize the specified scope to supervise
 * any fibers forked within the original effect.
 *
 * @dataFirst overrideForkScope_
 */
export function overrideForkScope(scope: Scope<Exit<any, any>>): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => overrideForkScope_(ma, scope)
}

/**
 * Returns a new effect that will utilize the default scope (fiber scope) to
 * supervise any fibers forked within the original effect.
 */
export function defaultForkScope<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return new OverrideForkScope(ma, O.None())
}
