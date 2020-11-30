import type { V as Variance } from "@principia/prelude/HKT";

import type { Option } from "../Option";
import type { SIO } from "../SIO";
import type { Cause } from "./Cause";
import { _A, _E, _I, _R, _U, IOInstructionTag } from "./constants";
import type { Exit } from "./Exit/model";
import type { Executor } from "./Fiber/executor";
import type { FiberId } from "./Fiber/FiberId";
import type { Fiber, FiberDescriptor, InterruptStatus } from "./Fiber/model";
import type { FiberRef } from "./FiberRef/model";
import type { Scope } from "./Scope";
import type { Supervisor } from "./Supervisor";

export { _A, _E, _I, _R, _U, IOInstructionTag } from "./constants";

/*
 * -------------------------------------------
 * IO Model
 * -------------------------------------------
 */

export const URI = "IO";

export type URI = typeof URI;

export abstract class IO<R, E, A> {
  readonly [_U]: URI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void;

  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  get [_I](): Instruction {
    return this as any;
  }
}

export type Instruction =
  | ChainInstruction<any, any, any, any, any, any>
  | SucceedInstruction<any>
  | PartialInstruction<any, any>
  | TotalInstruction<any>
  | AsyncInstruction<any, any, any>
  | FoldInstruction<any, any, any, any, any, any, any, any, any>
  | ForkInstruction<any, any, any>
  | SetInterruptInstruction<any, any, any>
  | GetInterruptInstruction<any, any, any>
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
  | SIO<unknown, never, any, any, any>
  | Integration<any, any, any>;

export type V = Variance<"E", "+"> & Variance<"R", "-">;

export type UIO<A> = IO<unknown, never, A>;
export type URIO<R, A> = IO<R, never, A>;
export type FIO<E, A> = IO<unknown, E, A>;

export type Canceler<R> = URIO<R, void>;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: IO<R, E, A>;
  }
}

/*
 * -------------------------------------------
 * IO Instructions
 * -------------------------------------------
 */

export class ChainInstruction<R, R1, E, E1, A, A1> extends IO<R & R1, E | E1, A1> {
  readonly _tag = IOInstructionTag.Chain;
  constructor(readonly io: IO<R, E, A>, readonly f: (a: A) => IO<R1, E1, A1>) {
    super();
  }
}

export class SucceedInstruction<A> extends IO<unknown, never, A> {
  readonly _tag = IOInstructionTag.Succeed;
  constructor(readonly value: A) {
    super();
  }
}

export class PartialInstruction<E, A> extends IO<unknown, E, A> {
  readonly _tag = IOInstructionTag.Partial;
  constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
    super();
  }
}

export class TotalInstruction<A> extends IO<unknown, never, A> {
  readonly _tag = IOInstructionTag.Total;
  constructor(readonly thunk: () => A) {
    super();
  }
}

export class AsyncInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Async;
  constructor(
    readonly register: (f: (_: IO<R, E, A>) => void) => Option<IO<R, E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {
    super();
  }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends IO<
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _tag = IOInstructionTag.Fold;

  constructor(
    readonly io: IO<R, E, A>,
    readonly onFailure: (cause: Cause<E>) => IO<R1, E1, B>,
    readonly onSuccess: (a: A) => IO<R2, E2, C>
  ) {
    super();
  }

  apply(v: A): IO<R & R1 & R2, E1 | E2, B | C> {
    return this.onSuccess(v);
  }
}

export class ForkInstruction<R, E, A> extends IO<R, never, Executor<E, A>> {
  readonly _tag = IOInstructionTag.Fork;

  constructor(readonly io: IO<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export class FailInstruction<E> extends IO<unknown, E, never> {
  readonly _tag = IOInstructionTag.Fail;

  constructor(readonly cause: Cause<E>) {
    super();
  }
}

export class YieldInstruction extends IO<unknown, never, void> {
  readonly _tag = IOInstructionTag.Yield;

  constructor() {
    super();
  }
}

export class ReadInstruction<R0, R, E, A> extends IO<R & R0, E, A> {
  readonly _tag = IOInstructionTag.Read;

  constructor(readonly f: (_: R0) => IO<R, E, A>) {
    super();
  }
}

export class GiveInstruction<R, E, A> extends IO<unknown, E, A> {
  readonly _tag = IOInstructionTag.Give;

  constructor(readonly io: IO<R, E, A>, readonly env: R) {
    super();
  }
}

export class SuspendInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Suspend;

  constructor(readonly factory: () => IO<R, E, A>) {
    super();
  }
}

export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends IO<
  R & R1 & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "Race";

  constructor(
    readonly left: IO<R, E, A>,
    readonly right: IO<R1, E1, A1>,
    readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
    readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
    readonly scope: Option<Scope<Exit<any, any>>>
  ) {
    super();
  }
}

export class SetInterruptInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.SetInterrupt;

  constructor(readonly io: IO<R, E, A>, readonly flag: InterruptStatus) {
    super();
  }
}

export class GetInterruptInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.GetInterrupt;

  constructor(readonly f: (_: InterruptStatus) => IO<R, E, A>) {
    super();
  }
}

export class CheckDescriptorInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.CheckDescriptor;

  constructor(readonly f: (_: FiberDescriptor) => IO<R, E, A>) {
    super();
  }
}

export class SuperviseInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Supervise;

  constructor(readonly io: IO<R, E, A>, readonly supervisor: Supervisor<any>) {
    super();
  }
}

export class SuspendPartialInstruction<R, E, A, E2> extends IO<R, E | E2, A> {
  readonly _tag = IOInstructionTag.SuspendPartial;

  constructor(readonly factory: () => IO<R, E, A>, readonly onThrow: (u: unknown) => E2) {
    super();
  }
}

export class NewFiberRefInstruction<A> extends IO<unknown, never, FiberRef<A>> {
  readonly _tag = IOInstructionTag.NewFiberRef;

  constructor(
    readonly initial: A,
    readonly onFork: (a: A) => A,
    readonly onJoin: (a: A, a2: A) => A
  ) {
    super();
  }
}

export class ModifyFiberRefInstruction<A, B> extends IO<unknown, never, B> {
  readonly _tag = IOInstructionTag.ModifyFiberRef;

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
    super();
  }
}

export class GetForkScopeInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.GetForkScope;

  constructor(readonly f: (_: Scope<Exit<any, any>>) => IO<R, E, A>) {
    super();
  }
}

export class OverrideForkScopeInstruction<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.OverrideForkScope;

  constructor(readonly io: IO<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export const integrationNotImplemented = new FailInstruction({
  _tag: "Die",
  value: new Error("Integration not implemented or unsupported")
});

export abstract class Integration<R, E, A> extends IO<R, E, A> {
  readonly _tag = IOInstructionTag.Integration;
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
