import type * as HKT from "@principia/prelude/HKT";

import type { XPure } from "../XPure";

/*
 * -------------------------------------------
 * Sync Model
 * -------------------------------------------
 */

export interface Sync<R, E, A> extends XPure<unknown, never, R, E, A> {}

export const URI = "Sync";

export type URI = typeof URI;

export type V = HKT.V<"R", "-"> & HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Sync<R, E, A>;
   }
}
