import type * as HKT from "@principia/prelude/HKT";

import type { Either } from "../Either";

/*
 * -------------------------------------------
 * These Model
 * -------------------------------------------
 */

export interface Both<E, A> {
  readonly _tag: "Both";
  readonly left: E;
  readonly right: A;
}

export type These<E, A> = Either<E, A> | Both<E, A>;

export const URI = "These";
export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: These<E, A>;
  }
}
