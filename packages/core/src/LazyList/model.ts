/**
 * A (experimental) lazy singly-linked list implementation. Similar to Haskell's `List`
 */
import type * as HKT from "@principia/prelude/HKT";

import type { Lazy } from "../Function";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Nil {
   readonly _tag: "Nil";
}

export type Cons<A> = {
   readonly _tag: "Cons";
   readonly head: Lazy<A>;
   readonly tail: Lazy<LazyList<A>>;
};

export type LazyList<A> = Nil | Cons<A>;

export const errorEmptyList = (fun: string) => {
   throw new Error(`List.${fun}: empty list`);
};

export type InferListType<T> = T extends LazyList<infer A> ? A : never;

export const URI = "LazyList";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: LazyList<A>;
   }
}
