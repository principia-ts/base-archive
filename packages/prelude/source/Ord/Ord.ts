import type { Eq } from "../Eq";
import type { CompareFn, CompareFn_ } from "./CompareFn";

export const URI = "Ord";

export type URI = typeof URI;

export interface Ord<A> extends Eq<A> {
   readonly compare_: CompareFn_<A>;
   readonly compare: CompareFn<A>;
}

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Ord<A>;
   }
}
