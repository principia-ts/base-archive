import type * as HKT from "@principia/prelude/HKT";

export interface Tuple<A, E> extends Readonly<[A, E]> {}

export const URI = "Tuple";
export type URI = typeof URI;

export type V = HKT.V<"I", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Tuple<A, I>;
   }
}
