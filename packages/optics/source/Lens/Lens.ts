import type * as HKT from "@principia/core/HKT";

/*
 * -------------------------------------------
 * Lens Model
 * -------------------------------------------
 */

export interface Lens<S, A> {
   readonly get: (s: S) => A;
   readonly set: (a: A) => (s: S) => S;
}

export const URI = "optics/Lens";

export type URI = typeof URI;

export type V = HKT.V<"E", "_">;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Lens<E, A>;
   }
}
