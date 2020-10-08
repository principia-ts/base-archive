import type { V as Variance } from "@principia/core/HKT";
import type { Option } from "@principia/core/Option";

import type { Cause } from "../Cause";
import type { Exit } from "../Exit/Exit";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/Fiber";
import type { FiberContext } from "../Fiber/FiberContext";
import type { FiberId } from "../Fiber/FiberId";
import type { FiberRef } from "../FiberRef/FiberRef";
import type { Scope } from "../Scope";
import type { Supervisor } from "../Supervisor";
import type { XPure } from "../XPure/XPure";

/*
 * -------------------------------------------
 * Effect Model
 * -------------------------------------------
 */

export const _R = "_R";
export const _E = "_E";
export const _A = "_A";
export const _I = "_I";
export const _U = "_U";

export const URI = "Effect";

export type URI = typeof URI;

export interface Effect<R, E, A> {
   readonly [_U]: URI;
   readonly [_E]: () => E;
   readonly [_A]: () => A;
   readonly [_R]: (_: R) => void;

   readonly [_I]: Instruction;

   readonly _S1: (_: unknown) => void;
   readonly _S2: () => never;
}

export type Instruction =
   | ChainInstruction<any, any, any, any, any, any>
   | PureInstruction<any>
   | PartialInstruction<any, any>
   | TotalInstruction<any>
   | AsyncInstruction<any, any, any>
   | FoldInstruction<any, any, any, any, any, any, any, any, any>
   | ForkInstruction<any, any, any>
   | ChangeInterruptStatusInstruction<any, any, any>
   | CheckInterruptInstruction<any, any, any>
   | FailInstruction<any>
   | CheckDescriptorInstruction<any, any, any>
   | YieldInstruction
   | ReadInstruction<any, any, any, any>
   | ProvideInstruction<any, any, any>
   | SuspendInstruction<any, any, any>
   | SuspendPartialInstruction<any, any, any, any>
   | NewFiberRefInstruction<any>
   | ModifyFiberRefInstruction<any, any>
   | RaceInstruction<any, any, any, any, any, any, any, any, any, any, any, any>
   | SuperviseInstruction<any, any, any>
   | GetForkScopeInstruction<any, any, any>
   | OverrideForkScopeInstruction<any, any, any>
   | XPure<unknown, never, any, any, any>;

export abstract class BaseInstruction<R, E, A> implements Effect<R, E, A> {
   readonly _S1!: (_: unknown) => void;
   readonly _S2!: () => never;

   readonly [_U]: URI;
   readonly [_E]: () => E;
   readonly [_A]: () => A;
   readonly [_R]: (_: R) => void;

   get [_I]() {
      return this as any;
   }
}

export type V = Variance<"E", "+"> & Variance<"R", "-">;

export type UIO<A> = Effect<unknown, never, A>;
export type RIO<R, A> = Effect<R, never, A>;
export type IO<E, A> = Effect<unknown, E, A>;

export type Canceler<R> = RIO<R, void>;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Effect<R, E, A>;
   }
}

/*
 * -------------------------------------------
 * Effect Instructions
 * -------------------------------------------
 */

export class ChainInstruction<R, R1, E, E1, A, A1> extends BaseInstruction<R & R1, E | E1, A1> {
   readonly _tag = "Chain";
   constructor(readonly ma: Effect<R, E, A>, readonly f: (a: A) => Effect<R1, E1, A1>) {
      super();
   }
}

export class PureInstruction<A> extends BaseInstruction<unknown, never, A> {
   readonly _tag = "Pure";
   constructor(readonly value: A) {
      super();
   }
}

export class PartialInstruction<E, A> extends BaseInstruction<unknown, E, A> {
   readonly _tag = "Partial";
   constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
      super();
   }
}

export class TotalInstruction<A> extends BaseInstruction<unknown, never, A> {
   readonly _tag = "Total";
   constructor(readonly thunk: () => A) {
      super();
   }
}

export class AsyncInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "Async";
   constructor(
      readonly register: (f: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>,
      readonly blockingOn: ReadonlyArray<FiberId>
   ) {
      super();
   }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends BaseInstruction<R & R1 & R2, E1 | E2, B | C> {
   readonly _tag = "Fold";

   constructor(
      readonly fa: Effect<R, E, A>,
      readonly onFailure: (cause: Cause<E>) => Effect<R1, E1, B>,
      readonly onSuccess: (a: A) => Effect<R2, E2, C>
   ) {
      super();
   }

   apply(v: A): Effect<R & R1 & R2, E1 | E2, B | C> {
      return this.onSuccess(v);
   }
}

export class ForkInstruction<R, E, A> extends BaseInstruction<R, never, FiberContext<E, A>> {
   readonly _tag = "Fork";

   constructor(readonly E: Effect<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
      super();
   }
}

export class FailInstruction<E> extends BaseInstruction<unknown, E, never> {
   readonly _tag = "Fail";

   constructor(readonly C: Cause<E>) {
      super();
   }
}

export class YieldInstruction extends BaseInstruction<unknown, never, void> {
   readonly _tag = "Yield";

   constructor() {
      super();
   }
}

export class ReadInstruction<R0, R, E, A> extends BaseInstruction<R & R0, E, A> {
   readonly _tag = "Read";

   constructor(readonly f: (_: R0) => Effect<R, E, A>) {
      super();
   }
}

export class ProvideInstruction<R, E, A> extends BaseInstruction<unknown, E, A> {
   readonly _tag = "Provide";

   constructor(readonly fa: Effect<R, E, A>, readonly env: R) {
      super();
   }
}

export class SuspendInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "Suspend";

   constructor(readonly factory: () => Effect<R, E, A>) {
      super();
   }
}

export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends BaseInstruction<
   R & R1 & R2 & R3,
   E2 | E3,
   A2 | A3
> {
   readonly _tag = "Race";

   constructor(
      readonly left: Effect<R, E, A>,
      readonly right: Effect<R1, E1, A1>,
      readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
      readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
      readonly scope: Option<Scope<Exit<any, any>>>
   ) {
      super();
   }
}

export class ChangeInterruptStatusInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "ChangeInterruptStatus";

   constructor(readonly E: Effect<R, E, A>, readonly flag: InterruptStatus) {
      super();
   }
}

export class CheckInterruptInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "CheckInterrupt";

   constructor(readonly f: (_: InterruptStatus) => Effect<R, E, A>) {
      super();
   }
}

export class CheckDescriptorInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "CheckDescriptor";

   constructor(readonly f: (_: FiberDescriptor) => Effect<R, E, A>) {
      super();
   }
}

export class SuperviseInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "Supervise";

   constructor(readonly E: Effect<R, E, A>, readonly supervisor: Supervisor<any>) {
      super();
   }
}

export class SuspendPartialInstruction<R, E, A, E2> extends BaseInstruction<R, E | E2, A> {
   readonly _tag = "SuspendPartial";

   constructor(readonly factory: () => Effect<R, E, A>, readonly onThrow: (u: unknown) => E2) {
      super();
   }
}

export class NewFiberRefInstruction<A> extends BaseInstruction<unknown, never, FiberRef<A>> {
   readonly _tag = "NewFiberRef";

   constructor(readonly initial: A, readonly onFork: (a: A) => A, readonly onJoin: (a: A, a2: A) => A) {
      super();
   }
}

export class ModifyFiberRefInstruction<A, B> extends BaseInstruction<unknown, never, B> {
   readonly _tag = "ModifyFiberRef";

   constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
      super();
   }
}

export class GetForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "GetForkScope";

   constructor(readonly f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>) {
      super();
   }
}

export class OverrideForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "OverrideForkScope";

   constructor(readonly E: Effect<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
      super();
   }
}
