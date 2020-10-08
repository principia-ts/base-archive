/**
 * A lazy singly-linked list implementation
 */
import type { Lazy } from "../Function";
import type * as HKT from "../HKT";

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
   readonly tail: Lazy<List<A>>;
};

export type List<A> = Nil | Cons<A>;

export const errorEmptyList = (fun: string) => {
   throw new Error(`List.${fun}: empty list`);
};

export type InferListType<T> = T extends List<infer A> ? A : never;

export const URI = "List";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: List<A>;
   }
}
