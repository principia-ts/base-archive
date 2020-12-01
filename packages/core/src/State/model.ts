import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * State Model
 * -------------------------------------------
 */

export interface State<S, A> {
  (s: S): [A, S];
}

export const URI = "State";
export type URI = typeof URI;

export type V = HKT.V<"S", "_">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: State<S, A>;
  }
}
