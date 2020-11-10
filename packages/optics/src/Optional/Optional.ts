import type { Option } from "@principia/core/Option";
import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * Optional Model
 * -------------------------------------------
 */

export interface Optional<S, A> {
   readonly getOption: (s: S) => Option<A>;
   readonly set: (a: A) => (s: S) => S;
}

export const URI = "optics/Optional";

export type URI = typeof URI;

export type V = HKT.V<"I", "_">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Optional<I, A>;
   }
}
