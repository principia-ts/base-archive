import type * as HKT from "@principia/core/HKT";
import type * as TC from "@principia/core/typeclass-index";

import { ModifyF } from "../internal";

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

export type V = HKT.V<"E", "_">;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Traversal<E, A>;
   }
}
