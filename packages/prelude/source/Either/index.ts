/**
 * Everybody's favorite sum type
 *
 * Either represents values with two possibilities: Left<E> or Right<A>
 * By convention, the _Left_ constructor is used to hold an Error value
 * and the _Right_ constructor is used to hold a correct value
 */

import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Left<E> {
   readonly _tag: "Left";
   readonly left: E;
}

export interface Right<A> {
   readonly _tag: "Right";
   readonly right: A;
}

export type Either<E, A> = Left<E> | Right<A>;

export type InferLeft<T extends Either<any, any>> = T extends Left<infer E> ? E : never;

export type InferRight<T extends Either<any, any>> = T extends Right<infer A> ? A : never;

export const URI = "Either";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Either<E, A>;
   }
   interface URItoKind2<TC, E, A> {
      readonly [URI]: Either<E, A>;
   }
}
