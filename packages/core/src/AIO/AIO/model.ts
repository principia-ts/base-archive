import type { V as Variance } from "@principia/prelude/HKT";

import type { Option } from "../../Option";
import type { SIO } from "../../SIO";
import type { Cause } from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import type { Executor } from "../Fiber/executor";
import type { FiberId } from "../Fiber/FiberId";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/model";
import type { FiberRef } from "../FiberRef/model";
import type { Scope } from "../Scope";
import type { Supervisor } from "../Supervisor";
import { _A, _E, _I, _R, _U, AIOInstructionTag } from "./constants";

export { _A, _E, _I, _R, _U, AIOInstructionTag } from "./constants";

/*
 * -------------------------------------------
 * AIO Model
 * -------------------------------------------
 */

export const URI = "AIO";

export type URI = typeof URI;

export abstract class AIO<R, E, A> {
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

export type IO<A> = AIO<unknown, never, A>;
export type RIO<R, A> = AIO<R, never, A>;
export type EIO<E, A> = AIO<unknown, E, A>;

export type Canceler<R> = RIO<R, void>;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: AIO<R, E, A>;
  }
}

/*
 * -------------------------------------------
 * AIO Instructions
 * -------------------------------------------
 */

export class ChainInstruction<R, R1, E, E1, A, A1> extends AIO<R & R1, E | E1, A1> {
  readonly _tag = AIOInstructionTag.Chain;
  constructor(readonly aio: AIO<R, E, A>, readonly f: (a: A) => AIO<R1, E1, A1>) {
    super();
  }
}

export class SucceedInstruction<A> extends AIO<unknown, never, A> {
  readonly _tag = AIOInstructionTag.Succeed;
  constructor(readonly value: A) {
    super();
  }
}

export class PartialInstruction<E, A> extends AIO<unknown, E, A> {
  readonly _tag = AIOInstructionTag.Partial;
  constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
    super();
  }
}

export class TotalInstruction<A> extends AIO<unknown, never, A> {
  readonly _tag = AIOInstructionTag.Total;
  constructor(readonly thunk: () => A) {
    super();
  }
}

export class AsyncInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.Async;
  constructor(
    readonly register: (f: (_: AIO<R, E, A>) => void) => Option<AIO<R, E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {
    super();
  }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends AIO<
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _tag = AIOInstructionTag.Fold;

  constructor(
    readonly aio: AIO<R, E, A>,
    readonly onFailure: (cause: Cause<E>) => AIO<R1, E1, B>,
    readonly onSuccess: (a: A) => AIO<R2, E2, C>
  ) {
    super();
  }

  apply(v: A): AIO<R & R1 & R2, E1 | E2, B | C> {
    return this.onSuccess(v);
  }
}

export class ForkInstruction<R, E, A> extends AIO<R, never, Executor<E, A>> {
  readonly _tag = AIOInstructionTag.Fork;

  constructor(readonly aio: AIO<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export class FailInstruction<E> extends AIO<unknown, E, never> {
  readonly _tag = AIOInstructionTag.Fail;

  constructor(readonly cause: Cause<E>) {
    super();
  }
}

export class YieldInstruction extends AIO<unknown, never, void> {
  readonly _tag = AIOInstructionTag.Yield;

  constructor() {
    super();
  }
}

export class ReadInstruction<R0, R, E, A> extends AIO<R & R0, E, A> {
  readonly _tag = AIOInstructionTag.Read;

  constructor(readonly f: (_: R0) => AIO<R, E, A>) {
    super();
  }
}

export class GiveInstruction<R, E, A> extends AIO<unknown, E, A> {
  readonly _tag = AIOInstructionTag.Give;

  constructor(readonly aio: AIO<R, E, A>, readonly env: R) {
    super();
  }
}

export class SuspendInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.Suspend;

  constructor(readonly factory: () => AIO<R, E, A>) {
    super();
  }
}

export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends AIO<
  R & R1 & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "Race";

  constructor(
    readonly left: AIO<R, E, A>,
    readonly right: AIO<R1, E1, A1>,
    readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => AIO<R2, E2, A2>,
    readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => AIO<R3, E3, A3>,
    readonly scope: Option<Scope<Exit<any, any>>>
  ) {
    super();
  }
}

export class SetInterruptInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.SetInterrupt;

  constructor(readonly aio: AIO<R, E, A>, readonly flag: InterruptStatus) {
    super();
  }
}

export class GetInterruptInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.GetInterrupt;

  constructor(readonly f: (_: InterruptStatus) => AIO<R, E, A>) {
    super();
  }
}

export class CheckDescriptorInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.CheckDescriptor;

  constructor(readonly f: (_: FiberDescriptor) => AIO<R, E, A>) {
    super();
  }
}

export class SuperviseInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.Supervise;

  constructor(readonly aio: AIO<R, E, A>, readonly supervisor: Supervisor<any>) {
    super();
  }
}

export class SuspendPartialInstruction<R, E, A, E2> extends AIO<R, E | E2, A> {
  readonly _tag = AIOInstructionTag.SuspendPartial;

  constructor(readonly factory: () => AIO<R, E, A>, readonly onThrow: (u: unknown) => E2) {
    super();
  }
}

export class NewFiberRefInstruction<A> extends AIO<unknown, never, FiberRef<A>> {
  readonly _tag = AIOInstructionTag.NewFiberRef;

  constructor(
    readonly initial: A,
    readonly onFork: (a: A) => A,
    readonly onJoin: (a: A, a2: A) => A
  ) {
    super();
  }
}

export class ModifyFiberRefInstruction<A, B> extends AIO<unknown, never, B> {
  readonly _tag = AIOInstructionTag.ModifyFiberRef;

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
    super();
  }
}

export class GetForkScopeInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.GetForkScope;

  constructor(readonly f: (_: Scope<Exit<any, any>>) => AIO<R, E, A>) {
    super();
  }
}

export class OverrideForkScopeInstruction<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.OverrideForkScope;

  constructor(readonly aio: AIO<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export const integrationNotImplemented = new FailInstruction({
  _tag: "Die",
  value: new Error("Integration not implemented or unsupported")
});

export abstract class Integration<R, E, A> extends AIO<R, E, A> {
  readonly _tag = AIOInstructionTag.Integration;
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
