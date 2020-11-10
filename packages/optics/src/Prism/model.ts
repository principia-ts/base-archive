import type { Option } from "@principia/core/Option";
import type * as HKT from "@principia/prelude/HKT";

export interface Prism<S, A> {
   readonly getOption: (s: S) => Option<A>;
   readonly reverseGet: (a: A) => S;
}

export const URI = "optics/Prism";

export type URI = typeof URI;

export type V = HKT.V<"I", "_">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Prism<I, A>;
   }
}
