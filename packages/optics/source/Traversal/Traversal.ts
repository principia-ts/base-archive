import type * as HKT from "@principia/prelude/HKT";

import type { ModifyF } from "../internal";

/*
 * -------------------------------------------
 * Traversal Model
 * -------------------------------------------
 */

export interface Traversal<S, A> {
   readonly modifyF: ModifyF<S, A>;
}

export const URI = "optics/Traversal";

export type URI = typeof URI;

export type V = HKT.V<"I", "_">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Traversal<I, A>;
   }
}
