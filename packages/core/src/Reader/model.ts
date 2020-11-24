import type * as HKT from "@principia/prelude/HKT";

export interface Reader<R, A> {
  (r: R): A;
}

export type V = HKT.V<"R", "-">;

export const URI = "Reader";
export type URI = typeof URI;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Reader<R, A>;
  }
}
