/**
 * `List` is an implementation of a Relaxed Radix-Balanced Tree, a fast immutable data structure.
 *
 * It is forked from [List](https://github.com/funkia/list)
 */

import type * as HKT from "@principia/prelude/HKT";

import type { Node } from "./_internal";
import { arrayPush, ForwardListIterator } from "./_internal";
import { reduce_ } from "./foldable";

/**
 * Represents a list of elements.
 */
export class List<A> implements Iterable<A> {
  constructor(
    /** @private */
    readonly bits: number,
    /** @private */
    readonly offset: number,
    readonly length: number,
    /** @private */
    readonly prefix: A[],
    /** @private */
    readonly root: Node | undefined,
    /** @private */
    readonly suffix: A[]
  ) {}

  [Symbol.iterator](): Iterator<A> {
    return new ForwardListIterator(this);
  }

  toJSON(): readonly A[] {
    return reduce_<A, A[]>(this, [], arrayPush);
  }
}

export type MutableList<A> = { -readonly [K in keyof List<A>]: List<A>[K] } & {
  [Symbol.iterator]: () => Iterator<A>;
  /**
   * This property doesn't exist at run-time. It exists to prevent a
   * MutableList from being assignable to a List.
   */
  "@@mutable": true;
};

export const URI = "List";
export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: List<A>;
  }
}
