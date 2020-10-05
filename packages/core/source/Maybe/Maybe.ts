/**
 * Or is it?
 *
 * _Maybe_ represents an optional value. It consists of constructors _Nothing_
 * representing an empty value, and _Just_ representing the original datatype
 */

import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Nothing {
   readonly _tag: "Nothing";
}

export interface Just<A> {
   readonly _tag: "Just";
   readonly value: A;
}

export type Maybe<A> = Nothing | Just<A>;

export type InferJust<T extends Maybe<any>> = T extends Just<infer A> ? A : never;

export const URI = "Maybe";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: Maybe<A>;
   }
}
