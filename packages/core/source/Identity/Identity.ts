import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * Identity Model
 * -------------------------------------------
 */

export type Identity<A> = A;

export const URI = "Identity";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Identity<A>;
   }
}
