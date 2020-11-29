import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * LazyPromise Model
 * -------------------------------------------
 */

export interface LazyPromise<A> {
  (): Promise<A>;
}

export type InferA<T> = [T] extends [LazyPromise<infer A>] ? A : never;

export const URI = "LazyPromise";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: LazyPromise<A>;
  }
}
