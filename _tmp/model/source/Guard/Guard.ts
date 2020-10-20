/*
 * -------------------------------------------
 * Guard Model
 * -------------------------------------------
 */

export interface Guard<I, A extends I> {
   is: (i: I) => i is A;
}

export type TypeOf<G> = G extends Guard<any, infer A> ? A : never;

export type InputOf<G> = G extends Guard<infer I, any> ? I : never;

export const URI = "Guard";

export type URI = typeof URI;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Guard<unknown, A>;
   }
}
