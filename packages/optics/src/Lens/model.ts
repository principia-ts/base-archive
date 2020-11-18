import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * Lens Model
 * -------------------------------------------
 */

export interface Lens<S, A> {
  readonly get: (s: S) => A;
  readonly set: (a: A) => (s: S) => S;
}

export const URI = "optics/Lens";

export type URI = typeof URI;

export type V = HKT.V<"I", "_">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Lens<I, A>;
  }
}
