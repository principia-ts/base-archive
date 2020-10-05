import type { V as Variance } from "@principia/core/HKT";

import type * as C from "../Cause";

export type Exit<E, A> = Success<A> | Failure<E>;

export interface Success<A> {
   readonly _tag: "Success";
   readonly value: A;
}

export interface Failure<E> {
   readonly _tag: "Failure";
   readonly cause: C.Cause<E>;
}

export const URI = "Exit";
export type URI = typeof URI;

export type V = Variance<"E", "+">;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Exit<E, A>;
   }
}
