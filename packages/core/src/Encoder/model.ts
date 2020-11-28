import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * Encoder Model
 * -------------------------------------------
 */

export interface Encoder<O, A> {
  readonly encode: (a: A) => O;
}

export type OutputOf<E> = E extends Encoder<infer O, any> ? O : never;

export type TypeOf<E> = E extends Encoder<any, infer A> ? A : never;

export const URI = "Encoder";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Encoder<E, A>;
  }
}
