import type * as HKT from "@principia/prelude/HKT";

export const URI = "Set";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: ReadonlySet<A>;
   }
}
