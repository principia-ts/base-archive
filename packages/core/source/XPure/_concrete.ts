import { XPure } from "./model";

export enum XPureInstructionTag {
   Pure = "Pure",
   Total = "Total",
   Partial = "Partial",
   Suspend = "Suspend",
   Fail = "Fail",
   Modify = "Modify",
   Chain = "Chain",
   Fold = "Fold",
   Read = "Read",
   Give = "Give"
}

export class PureInstruction<A> extends XPure<unknown, never, unknown, never, A> {
   readonly _xptag = XPureInstructionTag.Pure;
   constructor(readonly value: A) {
      super();
   }
}

export class TotalInstruction<A> extends XPure<unknown, never, unknown, never, A> {
   readonly _xptag = XPureInstructionTag.Total;
   constructor(readonly thunk: () => A) {
      super();
   }
}

export class PartialInstruction<E, A> extends XPure<unknown, never, unknown, E, A> {
   readonly _xptag = XPureInstructionTag.Partial;
   constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
      super();
   }
}

export class SuspendInstruction<S1, S2, R, E, A> extends XPure<S1, S2, R, E, A> {
   readonly _xptag = XPureInstructionTag.Suspend;
   constructor(readonly factory: () => XPure<S1, S2, R, E, A>) {
      super();
   }
}

export class FailInstruction<E> extends XPure<unknown, never, unknown, E, never> {
   readonly _xptag = XPureInstructionTag.Fail;
   constructor(readonly e: E) {
      super();
   }
}

export class ModifyInstruction<S1, S2, A> extends XPure<S1, S2, unknown, never, A> {
   readonly _xptag = XPureInstructionTag.Modify;
   constructor(readonly run: (s1: S1) => readonly [S2, A]) {
      super();
   }
}

export class ChainInstruction<S1, S2, R, E, A, S3, Q, D, B> extends XPure<S1, S3, Q & R, D | E, B> {
   readonly _xptag = XPureInstructionTag.Chain;
   constructor(readonly ma: XPure<S1, S2, R, E, A>, readonly f: (a: A) => XPure<S2, S3, Q, D, B>) {
      super();
   }
}
export class FoldInstruction<S1, S2, S5, R, E, A, S3, R1, E1, B, S4, R2, E2, C> extends XPure<
   S1 & S5,
   S3 | S4,
   R & R1 & R2,
   E1 | E2,
   B | C
> {
   readonly _xptag = XPureInstructionTag.Fold;
   constructor(
      readonly fa: XPure<S1, S2, R, E, A>,
      readonly onFailure: (e: E) => XPure<S5, S3, R1, E1, B>,
      readonly onSuccess: (a: A) => XPure<S2, S4, R2, E2, C>
   ) {
      super();
   }
}

export class ReadInstruction<R0, S1, S2, R, E, A> extends XPure<S1, S2, R0 & R, E, A> {
   readonly _xptag = XPureInstructionTag.Read;
   constructor(readonly f: (r: R0) => XPure<S1, S2, R, E, A>) {
      super();
   }
}

export class GiveInstruction<S1, S2, R, E, A> extends XPure<S1, S2, unknown, E, A> {
   readonly _xptag = XPureInstructionTag.Give;
   constructor(readonly fa: XPure<S1, S2, R, E, A>, readonly r: R) {
      super();
   }
}

export type Concrete<S1, S2, R, E, A> =
   | PureInstruction<A>
   | FailInstruction<E>
   | ModifyInstruction<S1, S2, A>
   | ChainInstruction<S1, unknown, S2, R, R, E, E, unknown, A>
   | FoldInstruction<S1, unknown, unknown, R, E, unknown, unknown, unknown, unknown, unknown, S2, unknown, unknown, A>
   | ReadInstruction<unknown, S1, S2, R, E, A>
   | GiveInstruction<S1, S2, R, E, A>
   | SuspendInstruction<S1, S2, R, E, A>
   | TotalInstruction<A>
   | PartialInstruction<E, A>;
