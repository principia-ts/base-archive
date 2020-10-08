import type { Lazy } from "@principia/core/Function";

import { XPure } from "./XPure";

export class PureInstruction<A> extends XPure<unknown, never, unknown, never, A> {
   readonly _xptag = "Pure";

   constructor(readonly a: A) {
      super();
   }
}

export class TotalInstruction<A> extends XPure<unknown, never, unknown, never, A> {
   readonly _xptag = "Total";

   constructor(readonly thunk: Lazy<A>) {
      super();
   }
}

export class PartialInstruction<E, A> extends XPure<unknown, never, unknown, E, A> {
   readonly _xptag = "Partial";

   constructor(readonly thunk: Lazy<A>, readonly onThrow: (u: unknown) => E) {
      super();
   }
}

export class SuspendInstruction<S1, S2, R, E, A> extends XPure<S1, S2, R, E, A> {
   readonly _xptag = "Suspend";

   constructor(readonly factory: () => XPure<S1, S2, R, E, A>) {
      super();
   }
}

export class FailInstruction<E> extends XPure<unknown, never, unknown, E, never> {
   readonly _xptag = "Fail";

   constructor(readonly e: E) {
      super();
   }
}

export class ModifyInstruction<S1, S2, E, A> extends XPure<S1, S2, unknown, E, A> {
   readonly _xptag = "Modify";

   constructor(readonly run: (s1: S1) => readonly [S2, A]) {
      super();
   }
}

export class ChainInstruction<S1, S2, S3, R, R1, E, E1, A, B> extends XPure<S1, S3, R & R1, E1 | E, B> {
   readonly _xptag = "FlatMap";

   constructor(readonly ma: XPure<S1, S2, R, E, A>, readonly f: (a: A) => XPure<S2, S3, R1, E1, B>) {
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
   readonly _xptag = "Fold";

   constructor(
      readonly fa: XPure<S1, S2, R, E, A>,
      readonly onFailure: (e: E) => XPure<S5, S3, R1, E1, B>,
      readonly onSuccess: (a: A) => XPure<S2, S4, R2, E2, C>
   ) {
      super();
   }
}

export class AccessInstruction<R0, S1, S2, R, E, A> extends XPure<S1, S2, R0 & R, E, A> {
   readonly _xptag = "Access";

   constructor(readonly access: (r: R0) => XPure<S1, S2, R, E, A>) {
      super();
   }
}

export class ProvideInstruction<S1, S2, R, E, A> extends XPure<S1, S2, unknown, E, A> {
   readonly _xptag = "Provide";

   constructor(readonly fa: XPure<S1, S2, R, E, A>, readonly r: R) {
      super();
   }
}

export type Concrete<S1, S2, R, E, A> =
   | PureInstruction<A>
   | FailInstruction<E>
   | ModifyInstruction<S1, S2, E, A>
   | ChainInstruction<S1, unknown, S2, R, R, E, E, unknown, A>
   | FoldInstruction<S1, unknown, unknown, R, E, unknown, unknown, unknown, unknown, unknown, S2, unknown, unknown, A>
   | AccessInstruction<unknown, S1, S2, R, E, A>
   | ProvideInstruction<S1, S2, R, E, A>
   | SuspendInstruction<S1, S2, R, E, A>
   | TotalInstruction<A>
   | PartialInstruction<E, A>;

export class FoldFrame {
   readonly _xptag = "FoldFrame";
   constructor(
      readonly failure: (e: any) => XPure<any, any, any, any, any>,
      readonly apply: (e: any) => XPure<any, any, any, any, any>
   ) {}
}

export class ApplyFrame {
   readonly _xptag = "ApplyFrame";
   constructor(readonly apply: (e: any) => XPure<any, any, any, any, any>) {}
}

export type Frame = FoldFrame | ApplyFrame;
