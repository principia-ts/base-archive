/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as O from "../Option";
import {
   arrayPush,
   BackwardsListIterator,
   getDepth,
   getPrefixSize,
   getSuffixSize,
   handleOffset,
   nodeNth,
   nodeNthDense
} from "./_internal";
import { reduce_ } from "./foldable";
import type { List } from "./model";

/**
 * Returns an iterable that iterates backwards over the given list.
 *
 * @complexity O(1)
 */
export function backwards<A>(l: List<A>): Iterable<A> {
   return {
      [Symbol.iterator](): Iterator<A> {
         return new BackwardsListIterator(l);
      }
   };
}

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function unsafeNth_<A>(l: List<A>, index: number): A | undefined {
   if (index < 0 || l.length <= index) {
      return undefined;
   }
   const prefixSize = getPrefixSize(l);
   const suffixSize = getSuffixSize(l);
   if (index < prefixSize) {
      return l.prefix[prefixSize - index - 1];
   } else if (index >= l.length - suffixSize) {
      return l.suffix[index - (l.length - suffixSize)];
   }
   const { offset } = l;
   const depth = getDepth(l);
   return l.root!.sizes === undefined
      ? nodeNthDense(
           l.root!,
           depth,
           offset === 0 ? index - prefixSize : handleOffset(depth, offset, index - prefixSize)
        )
      : nodeNth(l.root!, depth, offset, index - prefixSize);
}

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function unsafeNth(index: number): <A>(l: List<A>) => A | undefined {
   return (l) => unsafeNth_(l, index);
}

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function nth_<A>(l: List<A>, index: number): O.Option<A> {
   return O.fromNullable(unsafeNth_(l, index));
}

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function nth(index: number): <A>(l: List<A>) => O.Option<A> {
   return (l) => nth_(l, index);
}

/**
 * Returns the first element of the list. If the list is empty the
 * function returns undefined.
 *
 * @complexity O(1)
 */
export function unsafeFirst<A>(l: List<A>): A | undefined {
   const prefixSize = getPrefixSize(l);
   return prefixSize !== 0 ? l.prefix[prefixSize - 1] : l.length !== 0 ? l.suffix[0] : undefined;
}

/**
 * Returns the first element of the list.
 *
 * @complexity O(1)
 */
export function first<A>(l: List<A>): O.Option<NonNullable<A>> {
   return O.fromNullable(unsafeFirst(l));
}

/**
 * Returns the last element of the list. If the list is empty the
 * function returns `undefined`.
 *
 * @complexity O(1)
 */
export function unsafeLast<A>(l: List<A>): A | undefined {
   const suffixSize = getSuffixSize(l);
   return suffixSize !== 0 ? l.suffix[suffixSize - 1] : l.length !== 0 ? l.prefix[0] : undefined;
}

/**
 * Returns the last element of the list.
 *
 * @complexity O(1)
 */
export function last<A>(l: List<A>): O.Option<NonNullable<A>> {
   return O.fromNullable(unsafeLast(l));
}

/**
 * Converts a list into an array.
 *
 * @complexity `O(n)`
 */
export function toArray<A>(l: List<A>): readonly A[] {
   return reduce_<A, A[]>(l, [], arrayPush);
}
