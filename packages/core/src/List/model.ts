/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-var */
import type { Node } from "./_internal";
import { arrayPush, ForwardListIterator } from "./_internal";
import { unsafeNth_ } from "./destructors";
import { reduce_ } from "./foldable";

/**
 * Represents a list of elements.
 */
export class List<A> implements Iterable<A> {
   constructor(
      readonly bits: number,
      readonly offset: number,
      readonly length: number,
      readonly prefix: A[],
      readonly root: Node | undefined,
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

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: List<A>;
   }
}
