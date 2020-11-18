import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * Iso Model
 * -------------------------------------------
 */

export interface Iso<S, A> {
  readonly get: (s: S) => A;
  readonly reverseGet: (a: A) => S;
}

export const URI = "optics/Iso";

export type URI = typeof URI;

export type V = HKT.V<"I", "_">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Iso<I, A>;
  }
}
