import type * as HKT from "@principia/prelude/HKT";

import type * as Ac from "../Async";
import { _AI } from "../Async/constants";
import { _A, _E, _I, _R, _U, AIOInstructionTag } from "../AIO/AIO/constants";
import type * as T from "../AIO/AIO/model";
import { SIOIntegrationNotImplemented, SIOtoAIO } from "./integration";

export const URI = "SIO";

export type URI = typeof URI;

export type V = HKT.V<"S", "_"> & HKT.V<"R", "-"> & HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: SIO<S, S, R, E, A>;
  }
}

export const _SI = "_SI";
export type _SI = typeof _SI;

/**
 * `SIO<S1, S2, R, E, A>` is a purely functional description of a synchronous computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `SIO` can be used to model a variety of effects
 * including context, state, and failure.
 */
export abstract class SIO<S1, S2, R, E, A> {
  readonly _tag = AIOInstructionTag.Integration;
  readonly _asyncTag = "SIO";

  readonly _S1!: (_: S1) => void;
  readonly _S2!: () => S2;

  readonly [_U]!: T.URI;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void;
  get [_I](): T.Instruction {
    const xi = SIOtoAIO.get;
    if (xi._tag === "Some") {
      return xi.value(this as any)[_I];
    }
    return SIOIntegrationNotImplemented;
  }
  get [_AI](): Ac.AsyncInstruction {
    return this as any;
  }
  get [_SI](): Instruction {
    return this as any;
  }
}

export enum SIOInstructionTag {
  Succeed = "Succeed",
  Total = "Total",
  Partial = "Partial",
  Suspend = "Suspend",
  Fail = "Fail",
  Modify = "Modify",
  Chain = "Chain",
  Fold = "Fold",
  Asks = "Asks",
  Give = "Give"
}

export class SucceedInstruction<A> extends SIO<unknown, never, unknown, never, A> {
  readonly _sio = SIOInstructionTag.Succeed;
  constructor(readonly value: A) {
    super();
  }
}

export class TotalInstruction<A> extends SIO<unknown, never, unknown, never, A> {
  readonly _sio = SIOInstructionTag.Total;
  constructor(readonly thunk: () => A) {
    super();
  }
}

export class PartialInstruction<E, A> extends SIO<unknown, never, unknown, E, A> {
  readonly _sio = SIOInstructionTag.Partial;
  constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
    super();
  }
}

export class SuspendInstruction<S1, S2, R, E, A> extends SIO<S1, S2, R, E, A> {
  readonly _sio = SIOInstructionTag.Suspend;
  constructor(readonly factory: () => SIO<S1, S2, R, E, A>) {
    super();
  }
}

export class FailInstruction<E> extends SIO<unknown, never, unknown, E, never> {
  readonly _sio = SIOInstructionTag.Fail;
  constructor(readonly e: E) {
    super();
  }
}

export class ModifyInstruction<S1, S2, A> extends SIO<S1, S2, unknown, never, A> {
  readonly _sio = SIOInstructionTag.Modify;
  constructor(readonly run: (s1: S1) => readonly [S2, A]) {
    super();
  }
}

export class ChainInstruction<S1, S2, R, E, A, S3, Q, D, B> extends SIO<S1, S3, Q & R, D | E, B> {
  readonly _sio = SIOInstructionTag.Chain;
  constructor(readonly ma: SIO<S1, S2, R, E, A>, readonly f: (a: A) => SIO<S2, S3, Q, D, B>) {
    super();
  }
}
export class FoldInstruction<S1, S2, S5, R, E, A, S3, R1, E1, B, S4, R2, E2, C> extends SIO<
  S1 & S5,
  S3 | S4,
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _sio = SIOInstructionTag.Fold;
  constructor(
    readonly fa: SIO<S1, S2, R, E, A>,
    readonly onFailure: (e: E) => SIO<S5, S3, R1, E1, B>,
    readonly onSuccess: (a: A) => SIO<S2, S4, R2, E2, C>
  ) {
    super();
  }
}

export class AsksInstruction<R0, S1, S2, R, E, A> extends SIO<S1, S2, R0 & R, E, A> {
  readonly _sio = SIOInstructionTag.Asks;
  constructor(readonly f: (r: R0) => SIO<S1, S2, R, E, A>) {
    super();
  }
}

export class GiveInstruction<S1, S2, R, E, A> extends SIO<S1, S2, unknown, E, A> {
  readonly _sio = SIOInstructionTag.Give;
  constructor(readonly fa: SIO<S1, S2, R, E, A>, readonly r: R) {
    super();
  }
}

export type Instruction =
  | SucceedInstruction<any>
  | FailInstruction<any>
  | ModifyInstruction<any, any, any>
  | ChainInstruction<any, any, any, any, any, any, any, any, any>
  | FoldInstruction<any, any, any, any, any, any, any, any, any, any, any, any, any, any>
  | AsksInstruction<any, any, any, any, any, any>
  | GiveInstruction<any, any, any, any, any>
  | SuspendInstruction<any, any, any, any, any>
  | TotalInstruction<any>
  | PartialInstruction<any, any>;
