import type { V as Variance } from "@principia/prelude/HKT";

import type { Cause } from "../Cause";

export type Exit<E, A> = Success<A> | Failure<E>;

export interface Success<A> {
  readonly _tag: "Success";
  readonly value: A;
}

export interface Failure<E> {
  readonly _tag: "Failure";
  readonly cause: Cause<E>;
}

export const URI = "Exit";
export type URI = typeof URI;

export type V = Variance<"E", "+">;
