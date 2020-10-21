import type * as HKT from "@principia/prelude/HKT";

import type { Instruction } from "../Effect/Effect";
import * as T from "../Effect/Effect/model";

export const URI = "XPure";

export type URI = typeof URI;

export type V = HKT.V<"S", "_"> & HKT.V<"R", "-"> & HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: XPure<S, S, R, E, A>;
   }
}

/**
 * `XPure<S1, S2, R, E, A>` is a purely functional description of a computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `XPure` can be used to model a variety of effects
 * including context, state, and failure.
 */
export interface XPure<S1, S2, R, E, A> {
   readonly _tag: "XPure";

   readonly _S1: (_: S1) => void;
   readonly _S2: () => S2;

   readonly [T._U]: T.URI;
   readonly [T._E]: () => E;
   readonly [T._A]: () => A;
   readonly [T._R]: (_: R) => void;
   readonly [T._I]: Instruction;
}
