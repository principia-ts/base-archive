import type * as HKT from "@principia/core/HKT";
import type { Maybe } from "@principia/core/Maybe";

export interface Prism<S, A> {
   readonly getMaybe: (s: S) => Maybe<A>;
   readonly reverseGet: (a: A) => S;
}

export const URI = "optics/Prism";

export type URI = typeof URI;

export type V = HKT.V<"E", "_">;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Prism<E, A>;
   }
}
