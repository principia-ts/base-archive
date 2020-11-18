import type * as HKT from "@principia/prelude/HKT";

export const URI = "Map";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: ReadonlyMap<K, A>;
  }
  interface URItoIndex<N extends string, K> {
    readonly [URI]: K;
  }
}
