/**
 * Multi-way trees
 */
import type * as HKT from "@principia/prelude/HKT";

export interface Tree<A> {
  readonly value: A;
  readonly forest: Forest<A>;
}

export type Forest<A> = ReadonlyArray<Tree<A>>;

export const URI = "Tree";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Tree<A>;
  }
}
