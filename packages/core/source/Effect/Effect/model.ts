import type { V as Variance } from "@principia/prelude/HKT";

import type { Option } from "../../Option";
import type { XPure } from "../../XPure";
import type { Cause } from "../Cause";
import type { Exit } from "../Exit/Exit";
import type { Driver } from "../Fiber/Driver";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/Fiber";
import type { FiberId } from "../Fiber/FiberId";
import type { FiberRef } from "../FiberRef/FiberRef";
import type { Scope } from "../Scope";
import type { Supervisor } from "../Supervisor";

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

export enum EffectInstructionTag {
   Pure = "Pure",
   Chain = "Chain",
   Partial = "Partial",
   Total = "Total",
   Async = "Async",
   Fold = "Fold",
   Fork = "Fork",
   Fail = "Fail",
   Yield = "Yield",
   Read = "Read",
   Give = "Give",
   Suspend = "Suspend",
   Race = "Race",
   InterruptStatus = "InterruptStatus",
   CheckInterrupt = "CheckInterrupt",
   CheckDescriptor = "CheckDescriptor",
   Supervise = "Supervise",
   SuspendPartial = "SuspendPartial",
   NewFiberRef = "NewFiberRef",
   ModifyFiberRef = "ModifyFiberRef",
   GetForkScope = "GetForkScope",
   OverrideForkScope = "OverrideForkScope",
   Integration = "Integration"
}

export type Instruction =
   | ChainInstruction<any, any, any, any, any, any>
   | PureInstruction<any>
   | PartialInstruction<any, any>
   | TotalInstruction<any>
   | AsyncInstruction<any, any, any>
   | FoldInstruction<any, any, any, any, any, any, any, any, any>
   | ForkInstruction<any, any, any>
   | InterruptStatusInstruction<any, any, any>
   | CheckInterruptInstruction<any, any, any>
   | FailInstruction<any>
   | CheckDescriptorInstruction<any, any, any>
   | YieldInstruction
   | ReadInstruction<any, any, any, any>
   | GiveInstruction<any, any, any>
   | SuspendInstruction<any, any, any>
   | SuspendPartialInstruction<any, any, any, any>
   | NewFiberRefInstruction<any>
   | ModifyFiberRefInstruction<any, any>
   | RaceInstruction<any, any, any, any, any, any, any, any, any, any, any, any>
   | SuperviseInstruction<any, any, any>
   | GetForkScopeInstruction<any, any, any>
   | OverrideForkScopeInstruction<any, any, any>
   | XPure<unknown, never, any, any, any>
   | Integration<any, any, any>;

export type V = Variance<"E", "+"> & Variance<"R", "-">;

export type UIO<A> = Effect<unknown, never, A>;
export type RIO<R, A> = Effect<R, never, A>;
export type IO<E, A> = Effect<unknown, E, A>;

export type Canceler<R> = RIO<R, void>;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Effect<R, E, A>;
   }
}

/*
 * -------------------------------------------
 * Effect Instructions
 * -------------------------------------------
 */

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

export class ChainInstruction<R, R1, E, E1, A, A1> extends BaseInstruction<R & R1, E | E1, A1> {
   readonly _tag = EffectInstructionTag.Chain;
   constructor(readonly effect: Effect<R, E, A>, readonly f: (a: A) => Effect<R1, E1, A1>) {
      super();
   }
}

export class PureInstruction<A> extends BaseInstruction<unknown, never, A> {
   readonly _tag = EffectInstructionTag.Pure;
   constructor(readonly value: A) {
      super();
   }
}

export class PartialInstruction<E, A> extends BaseInstruction<unknown, E, A> {
   readonly _tag = EffectInstructionTag.Partial;
   constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
      super();
   }
}

export class TotalInstruction<A> extends BaseInstruction<unknown, never, A> {
   readonly _tag = EffectInstructionTag.Total;
   constructor(readonly thunk: () => A) {
      super();
   }
}

export class AsyncInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.Async;
   constructor(
      readonly register: (f: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>,
      readonly blockingOn: ReadonlyArray<FiberId>
   ) {
      super();
   }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends BaseInstruction<R & R1 & R2, E1 | E2, B | C> {
   readonly _tag = EffectInstructionTag.Fold;

   constructor(
      readonly effect: Effect<R, E, A>,
      readonly onFailure: (cause: Cause<E>) => Effect<R1, E1, B>,
      readonly onSuccess: (a: A) => Effect<R2, E2, C>
   ) {
      super();
   }

   apply(v: A): Effect<R & R1 & R2, E1 | E2, B | C> {
      return this.onSuccess(v);
   }
}

export class ForkInstruction<R, E, A> extends BaseInstruction<R, never, Driver<E, A>> {
   readonly _tag = EffectInstructionTag.Fork;

   constructor(readonly effect: Effect<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
      super();
   }
}

export class FailInstruction<E> extends BaseInstruction<unknown, E, never> {
   readonly _tag = EffectInstructionTag.Fail;

   constructor(readonly cause: Cause<E>) {
      super();
   }
}

export class YieldInstruction extends BaseInstruction<unknown, never, void> {
   readonly _tag = EffectInstructionTag.Yield;

   constructor() {
      super();
   }
}

export class ReadInstruction<R0, R, E, A> extends BaseInstruction<R & R0, E, A> {
   readonly _tag = EffectInstructionTag.Read;

   constructor(readonly f: (_: R0) => Effect<R, E, A>) {
      super();
   }
}

export class GiveInstruction<R, E, A> extends BaseInstruction<unknown, E, A> {
   readonly _tag = EffectInstructionTag.Give;

   constructor(readonly effect: Effect<R, E, A>, readonly env: R) {
      super();
   }
}

export class SuspendInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.Suspend;

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

export class InterruptStatusInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.InterruptStatus;

   constructor(readonly effect: Effect<R, E, A>, readonly flag: InterruptStatus) {
      super();
   }
}

export class CheckInterruptInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.CheckInterrupt;

   constructor(readonly f: (_: InterruptStatus) => Effect<R, E, A>) {
      super();
   }
}

export class CheckDescriptorInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.CheckDescriptor;

   constructor(readonly f: (_: FiberDescriptor) => Effect<R, E, A>) {
      super();
   }
}

export class SuperviseInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.Supervise;

   constructor(readonly effect: Effect<R, E, A>, readonly supervisor: Supervisor<any>) {
      super();
   }
}

export class SuspendPartialInstruction<R, E, A, E2> extends BaseInstruction<R, E | E2, A> {
   readonly _tag = EffectInstructionTag.SuspendPartial;

   constructor(readonly factory: () => Effect<R, E, A>, readonly onThrow: (u: unknown) => E2) {
      super();
   }
}

export class NewFiberRefInstruction<A> extends BaseInstruction<unknown, never, FiberRef<A>> {
   readonly _tag = EffectInstructionTag.NewFiberRef;

   constructor(readonly initial: A, readonly onFork: (a: A) => A, readonly onJoin: (a: A, a2: A) => A) {
      super();
   }
}

export class ModifyFiberRefInstruction<A, B> extends BaseInstruction<unknown, never, B> {
   readonly _tag = EffectInstructionTag.ModifyFiberRef;

   constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
      super();
   }
}

export class GetForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.GetForkScope;

   constructor(readonly f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>) {
      super();
   }
}

export class OverrideForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = EffectInstructionTag.OverrideForkScope;

   constructor(readonly effect: Effect<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
      super();
   }
}

export const integrationNotImplemented = new FailInstruction({
   _tag: "Die",
   value: new Error("Integration not implemented or unsupported")
});

export abstract class Integration<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = "Integration";
   readonly _S1!: (_: unknown) => void;
   readonly _S2!: () => never;

   readonly [_U]!: URI;
   readonly [_E]!: () => E;
   readonly [_A]!: () => A;
   readonly [_R]!: (_: R) => void;

   get [_I](): Instruction {
      return integrationNotImplemented;
   }
}
