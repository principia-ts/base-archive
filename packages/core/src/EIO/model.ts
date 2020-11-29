import type * as HKT from "@principia/prelude/HKT";

import type { SIO } from "../SIO";

/*
 * -------------------------------------------
 * EIO Model
 * -------------------------------------------
 */

export interface EIO<E, A> extends SIO<unknown, never, unknown, E, A> {}

export const URI = "EIO";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: EIO<E, A>;
  }
}
