/**
 * Nothing special: just your standard array
 */

import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type InferArrayType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer A>
   ? A
   : never;

export const URI = "Array";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: ReadonlyArray<A>;
   }
   interface URItoIndex<N extends string, K> {
      readonly [URI]: number;
   }
}
