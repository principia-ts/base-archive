/**
 * Or is it?
 *
 * _Option_ represents an optional value. It consists of constructors _None_
 * representing an empty value, and _Some_ representing the original datatype
 */

import type * as HKT from "../HKT";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface None {
   readonly _tag: "None";
}

export interface Some<A> {
   readonly _tag: "Some";
   readonly value: A;
}

export type Option<A> = None | Some<A>;

export type InferSome<T extends Option<any>> = T extends Some<infer A> ? A : never;

export const URI = "Option";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Option<A>;
   }
   interface URItoKind1<TC, A> {
      readonly [URI]: Option<A>;
   }
}
