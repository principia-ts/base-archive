import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * Const Model
 * -------------------------------------------
 */

export type Const<E, A> = E & { readonly _A: A };

export const URI = "Const";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Const<E, A>;
   }
}
