/**
 * Stack-safe IO
 */
import type * as HKT from "@principia/prelude/HKT";

import type { XPure } from "../XPure";

/*
 * -------------------------------------------
 * IO Model
 * -------------------------------------------
 */

export const URI = "IO";

export type URI = typeof URI;

export type V = HKT.Auto;

export interface IO<A> extends XPure<unknown, never, unknown, never, A> {}

export type InferA<T> = [T] extends [IO<infer A>] ? A : never;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: IO<A>;
  }
}
