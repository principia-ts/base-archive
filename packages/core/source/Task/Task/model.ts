import type { V as Variance } from "@principia/prelude/HKT";

import type { Option } from "../../Option";
import type { XPure } from "../../XPure";
import type { Cause } from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import type { Executor } from "../Fiber/executor";
import type { FiberId } from "../Fiber/FiberId";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/model";
import type { FiberRef } from "../FiberRef/model";
import type { Scope } from "../Scope";
import type { Supervisor } from "../Supervisor";
import { _A, _E, _I, _R, _U, TaskInstructionTag } from "./constants";

export { _A, _E, _I, _R, _U, TaskInstructionTag };

/*
 * -------------------------------------------
 * Task Model
 * -------------------------------------------
 */

export const URI = "Task";

export type URI = typeof URI;

export interface Task<R, E, A> {
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

export type UIO<A> = Task<unknown, never, A>;
export type RIO<R, A> = Task<R, never, A>;
export type IO<E, A> = Task<unknown, E, A>;

export type Canceler<R> = RIO<R, void>;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Task<R, E, A>;
   }
}

/*
 * -------------------------------------------
 * Task Instructions
 * -------------------------------------------
 */

export abstract class BaseInstruction<R, E, A> implements Task<R, E, A> {
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
   readonly _tag = TaskInstructionTag.Chain;
   constructor(readonly effect: Task<R, E, A>, readonly f: (a: A) => Task<R1, E1, A1>) {
      super();
   }
}

export class PureInstruction<A> extends BaseInstruction<unknown, never, A> {
   readonly _tag = TaskInstructionTag.Pure;
   constructor(readonly value: A) {
      super();
   }
}

export class PartialInstruction<E, A> extends BaseInstruction<unknown, E, A> {
   readonly _tag = TaskInstructionTag.Partial;
   constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
      super();
   }
}

export class TotalInstruction<A> extends BaseInstruction<unknown, never, A> {
   readonly _tag = TaskInstructionTag.Total;
   constructor(readonly thunk: () => A) {
      super();
   }
}

export class AsyncInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.Async;
   constructor(
      readonly register: (f: (_: Task<R, E, A>) => void) => Option<Task<R, E, A>>,
      readonly blockingOn: ReadonlyArray<FiberId>
   ) {
      super();
   }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends BaseInstruction<R & R1 & R2, E1 | E2, B | C> {
   readonly _tag = TaskInstructionTag.Fold;

   constructor(
      readonly effect: Task<R, E, A>,
      readonly onFailure: (cause: Cause<E>) => Task<R1, E1, B>,
      readonly onSuccess: (a: A) => Task<R2, E2, C>
   ) {
      super();
   }

   apply(v: A): Task<R & R1 & R2, E1 | E2, B | C> {
      return this.onSuccess(v);
   }
}

export class ForkInstruction<R, E, A> extends BaseInstruction<R, never, Executor<E, A>> {
   readonly _tag = TaskInstructionTag.Fork;

   constructor(readonly effect: Task<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
      super();
   }
}

export class FailInstruction<E> extends BaseInstruction<unknown, E, never> {
   readonly _tag = TaskInstructionTag.Fail;

   constructor(readonly cause: Cause<E>) {
      super();
   }
}

export class YieldInstruction extends BaseInstruction<unknown, never, void> {
   readonly _tag = TaskInstructionTag.Yield;

   constructor() {
      super();
   }
}

export class ReadInstruction<R0, R, E, A> extends BaseInstruction<R & R0, E, A> {
   readonly _tag = TaskInstructionTag.Read;

   constructor(readonly f: (_: R0) => Task<R, E, A>) {
      super();
   }
}

export class GiveInstruction<R, E, A> extends BaseInstruction<unknown, E, A> {
   readonly _tag = TaskInstructionTag.Give;

   constructor(readonly effect: Task<R, E, A>, readonly env: R) {
      super();
   }
}

export class SuspendInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.Suspend;

   constructor(readonly factory: () => Task<R, E, A>) {
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
      readonly left: Task<R, E, A>,
      readonly right: Task<R1, E1, A1>,
      readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Task<R2, E2, A2>,
      readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Task<R3, E3, A3>,
      readonly scope: Option<Scope<Exit<any, any>>>
   ) {
      super();
   }
}

export class InterruptStatusInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.InterruptStatus;

   constructor(readonly effect: Task<R, E, A>, readonly flag: InterruptStatus) {
      super();
   }
}

export class CheckInterruptInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.CheckInterrupt;

   constructor(readonly f: (_: InterruptStatus) => Task<R, E, A>) {
      super();
   }
}

export class CheckDescriptorInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.CheckDescriptor;

   constructor(readonly f: (_: FiberDescriptor) => Task<R, E, A>) {
      super();
   }
}

export class SuperviseInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.Supervise;

   constructor(readonly effect: Task<R, E, A>, readonly supervisor: Supervisor<any>) {
      super();
   }
}

export class SuspendPartialInstruction<R, E, A, E2> extends BaseInstruction<R, E | E2, A> {
   readonly _tag = TaskInstructionTag.SuspendPartial;

   constructor(readonly factory: () => Task<R, E, A>, readonly onThrow: (u: unknown) => E2) {
      super();
   }
}

export class NewFiberRefInstruction<A> extends BaseInstruction<unknown, never, FiberRef<A>> {
   readonly _tag = TaskInstructionTag.NewFiberRef;

   constructor(readonly initial: A, readonly onFork: (a: A) => A, readonly onJoin: (a: A, a2: A) => A) {
      super();
   }
}

export class ModifyFiberRefInstruction<A, B> extends BaseInstruction<unknown, never, B> {
   readonly _tag = TaskInstructionTag.ModifyFiberRef;

   constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
      super();
   }
}

export class GetForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.GetForkScope;

   constructor(readonly f: (_: Scope<Exit<any, any>>) => Task<R, E, A>) {
      super();
   }
}

export class OverrideForkScopeInstruction<R, E, A> extends BaseInstruction<R, E, A> {
   readonly _tag = TaskInstructionTag.OverrideForkScope;

   constructor(readonly effect: Task<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
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
