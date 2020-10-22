import type { Option } from "../../Option";
import * as O from "../../Option";
import type { Exit } from "../Exit";
import type { Driver } from "../Fiber/Driver";
import type { Fiber, RuntimeFiber } from "../Fiber/Fiber";
import type { Scope } from "../Scope";
import { globalScope } from "../Scope";
import { pure } from "./core";
import type { Effect, RIO, UIO } from "./model";
import { ForkInstruction, GetForkScopeInstruction, OverrideForkScopeInstruction, RaceInstruction } from "./model";

export const forkScope: UIO<Scope<Exit<any, any>>> = new GetForkScopeInstruction(pure);

export const forkScopeWith = <R, E, A>(f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>) =>
   new GetForkScopeInstruction(f);

export class ForkScopeRestore {
   constructor(private scope: Scope<Exit<any, any>>) {}

   readonly restore = <R, E, A>(ma: Effect<R, E, A>): Effect<R, E, A> =>
      new OverrideForkScopeInstruction(ma, O.some(this.scope));
}

export const forkScopeMask = (newScope: Scope<Exit<any, any>>) => <R, E, A>(
   f: (restore: ForkScopeRestore) => Effect<R, E, A>
) => forkScopeWith((scope) => new OverrideForkScopeInstruction(f(new ForkScopeRestore(scope)), O.some(newScope)));

export const forkIn = (scope: Scope<Exit<any, any>>) => <R, E, A>(value: Effect<R, E, A>): RIO<R, RuntimeFiber<E, A>> =>
   new ForkInstruction(value, O.some(scope));

export const raceWith = <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
   left: Effect<R, E, A>,
   right: Effect<R1, E1, A1>,
   leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
   rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
   scope: Option<Scope<Exit<any, any>>> = O.none()
): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> => new RaceInstruction(left, right, leftWins, rightWins, scope);

export type Grafter = <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;

export const transplant = <R, E, A>(f: (_: Grafter) => Effect<R, E, A>) =>
   forkScopeWith((scope) => f((e) => new OverrideForkScopeInstruction(e, O.some(scope))));

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export const forkDaemon = <R, E, A>(ma: Effect<R, E, A>): RIO<R, Driver<E, A>> =>
   new ForkInstruction(ma, O.some(globalScope));
