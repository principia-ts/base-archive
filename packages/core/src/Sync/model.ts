import type * as HKT from "@principia/prelude/HKT";

import type { SIO } from "../SIO";

/*
 * -------------------------------------------
 * Sync Model
 * -------------------------------------------
 */

export interface Sync<R, E, A> extends SIO<unknown, never, R, E, A> {}

export type USync<A> = Sync<unknown, never, A>;
export type FSync<E, A> = Sync<unknown, E, A>;
export type URSync<R, A> = Sync<R, never, A>;

export const URI = "Sync";

export type URI = typeof URI;

export type V = HKT.V<"R", "-"> & HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Sync<R, E, A>;
  }
}
