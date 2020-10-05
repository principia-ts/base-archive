import type * as HKT from "../HKT";

export const URI = "Map";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: ReadonlyMap<K, A>;
   }
   interface URItoIndex<N extends string, K> {
      [URI]: K;
   }
}
