import type * as HKT from "@principia/prelude/HKT";

export type NonEmptyArray<A> = ReadonlyArray<A> & {
  readonly 0: A;
};

export const URI = "NonEmptyArray";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: NonEmptyArray<A>;
  }
  interface URItoIndex<N, K> {
    readonly [URI]: number;
  }
}
