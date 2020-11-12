/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Ordering } from "@principia/prelude/Ordering";
import { toNumber } from "@principia/prelude/Ordering";

import * as O from "../Option";
import type { EqualsState, FindIndexState, PredState } from "./_internal";
import {
   affixPush,
   appendNodeToTree,
   branchBits,
   concatAffixes,
   concatBuffer,
   concatSubTree,
   containsCb,
   containsState,
   copyArray,
   elementEquals,
   emptyAffix,
   equalsCb,
   everyCb,
   findCb,
   findIndexCb,
   findNotIndexCb,
   foldlCb,
   foldrCb,
   getDepth,
   getHeight,
   getPrefixSize,
   getSuffixSize,
   incrementPrefix,
   incrementSuffix,
   indexOfCb,
   mask,
   newAffix,
   newOffset,
   prependNodeToTree,
   push,
   reverseArray,
   setDepth,
   setPrefix,
   setSizes,
   setSuffix,
   sliceLeft,
   sliceRight,
   sliceTreeList,
   someCb,
   updateNode,
   zeroOffset
} from "./_internal";
import { empty, emptyPushable } from "./constructors";
import type { MutableList } from "./model";
import { List } from "./model";
import { unsafeLast, unsafeNth_ } from "./destructors";
import { reduce_ } from "./foldable";
import { map_ } from "./functor";

export function cloneList<A>(l: List<A>): MutableList<A> {
   return new List(l.bits, l.offset, l.length, l.prefix, l.root, l.suffix) as any;
}

/**
 * Prepends an element to the front of a list and returns the new list.
 *
 * @complexity O(1)
 */
export function prepend_<A>(l: List<A>, value: A): List<A> {
   const prefixSize = getPrefixSize(l);
   if (prefixSize < 32) {
      return new List<A>(
         incrementPrefix(l.bits),
         l.offset,
         l.length + 1,
         affixPush(value, l.prefix, prefixSize),
         l.root,
         l.suffix
      );
   } else {
      const newList = cloneList(l);
      prependNodeToTree(newList, reverseArray(l.prefix));
      const newPrefix = [value];
      newList.prefix = newPrefix;
      newList.length++;
      newList.bits = setPrefix(1, newList.bits);
      return newList;
   }
}

/**
 * Prepends an element to the front of a list and returns the new list.
 *
 * @complexity O(1)
 */
export function prepend<A>(value: A): (l: List<A>) => List<A> {
   return (l) => prepend_(l, value);
}

/**
 * Appends an element to the end of a list and returns the new list.
 *
 * @complexity O(n)
 */
export function append_<A>(l: List<A>, value: A): List<A> {
   const suffixSize = getSuffixSize(l);
   if (suffixSize < 32) {
      return new List(
         incrementSuffix(l.bits),
         l.offset,
         l.length + 1,
         l.prefix,
         l.root,
         affixPush(value, l.suffix, suffixSize)
      );
   }
   const newSuffix = [value];
   const newList = cloneList(l);
   appendNodeToTree(newList, l.suffix);
   newList.suffix = newSuffix;
   newList.length++;
   newList.bits = setSuffix(1, newList.bits);
   return newList;
}

/**
 * Appends an element to the end of a list and returns the new list.
 *
 * @complexity O(n)
 */
export function append<A>(value: A): (l: List<A>) => List<A> {
   return (l) => append_(l, value);
}

/**
 * Gets the length of a list.
 *
 * @complexity `O(1)`
 */
export function length(l: List<any>): number {
   return l.length;
}

/**
 * Extracts the specified property from each object in the list.
 */
export function pluck_<A, K extends keyof A>(l: List<A>, key: K): List<A[K]> {
   return map_(l, (a) => a[key]);
}

/**
 * Extracts the specified property from each object in the list.
 */
export function pluck<A, K extends keyof A>(key: K): (l: List<A>) => List<A[K]> {
   return (l) => pluck_(l, key);
}

/**
 * Concatenates the strings in the list separated by a specified separator.
 */
export function join_(l: List<string>, separator: string): string {
   return reduce_(l, "", (a, b) => (a.length === 0 ? b : a + separator + b));
}

/**
 * Concatenates the strings in the list separated by a specified separator.
 */
export function join(separator: string): (l: List<string>) => string {
   return (l) => join_(l, separator);
}

/**
 * Concatenates two lists.
 *
 * @complexity O(log(n))
 */
export function concat_<A>(left: List<A>, right: List<A>): List<A> {
   if (left.length === 0) {
      return right;
   } else if (right.length === 0) {
      return left;
   }
   const newSize = left.length + right.length;
   const rightSuffixSize = getSuffixSize(right);
   let newList = cloneList(left);
   if (right.root === undefined) {
      // right is nothing but a prefix and a suffix
      const nrOfAffixes = concatAffixes(left, right);
      for (let i = 0; i < nrOfAffixes; ++i) {
         newList = appendNodeToTree(newList, concatBuffer[i]);
         newList.length += concatBuffer[i].length;
         // wipe pointer, otherwise it might end up keeping the array alive
         concatBuffer[i] = undefined;
      }
      newList.length = newSize;
      newList.suffix = concatBuffer[nrOfAffixes];
      newList.bits = setSuffix(concatBuffer[nrOfAffixes].length, newList.bits);
      concatBuffer[nrOfAffixes] = undefined;
      return newList;
   } else {
      const leftSuffixSize = getSuffixSize(left);
      if (leftSuffixSize > 0) {
         newList = appendNodeToTree(newList, left.suffix.slice(0, leftSuffixSize));
         newList.length += leftSuffixSize;
      }
      newList = appendNodeToTree(newList, right.prefix.slice(0, getPrefixSize(right)).reverse());
      const newNode = concatSubTree(newList.root!, getDepth(newList), right.root, getDepth(right), true);
      const newDepth = getHeight(newNode);
      setSizes(newNode, newDepth);
      newList.root = newNode;
      newList.offset &= ~(mask << (getDepth(left) * branchBits));
      newList.length = newSize;
      newList.bits = setSuffix(rightSuffixSize, setDepth(newDepth, newList.bits));
      newList.suffix = right.suffix;
      return newList;
   }
}

/**
 * Concatenates two lists.
 *
 * @complexity O(log(n))
 */
export function concat<A>(right: List<A>): (left: List<A>) => List<A> {
   return (left) => concat_(left, right);
}

/**
 * Returns a list that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given list is returned unchanged.
 *
 * @complexity O(log(n))
 */
export function update_<A>(l: List<A>, index: number, a: A): List<A> {
   if (index < 0 || l.length <= index) {
      return l;
   }
   const prefixSize = getPrefixSize(l);
   const suffixSize = getSuffixSize(l);
   const newList = cloneList(l);
   if (index < prefixSize) {
      const newPrefix = copyArray(newList.prefix);
      newPrefix[newPrefix.length - index - 1] = a;
      newList.prefix = newPrefix;
   } else if (index >= l.length - suffixSize) {
      const newSuffix = copyArray(newList.suffix);
      newSuffix[index - (l.length - suffixSize)] = a;
      newList.suffix = newSuffix;
   } else {
      newList.root = updateNode(l.root!, getDepth(l), index - prefixSize, l.offset, a);
   }
   return newList;
}

/**
 * Returns a list that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given list is returned unchanged.
 *
 * @complexity O(log(n))
 */
export function update<A>(index: number, a: A): (l: List<A>) => List<A> {
   return (l) => update_(l, index, a);
}

/**
 * Returns a list that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given list is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 */
export function modify_<A>(l: List<A>, index: number, f: (a: A) => A): List<A> {
   if (index < 0 || l.length <= index) {
      return l;
   }
   return update_(l, index, f(unsafeNth_(l, index)!));
}

/**
 * Returns a list that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given list is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 */
export function modify<A>(index: number, f: (a: A) => A): (l: List<A>) => List<A> {
   return (l) => modify_(l, index, f);
}

/**
 * Returns a slice of a list. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the list.
 *
 * @complexity `O(log(n))`
 */
export function slice_<A>(l: List<A>, from: number, to: number): List<A> {
   let { bits, length } = l;
   let _to = to;
   let _from = from;
   _to = Math.min(length, to);
   // Handle negative indices
   if (_from < 0) {
      _from = length + from;
   }
   if (_to < 0) {
      _to = length + to;
   }

   // Should we just return the empty list?
   if (_to <= _from || _to <= 0 || length <= _from) {
      return empty();
   }

   // Return list unchanged if we are slicing nothing off
   if (_from <= 0 && length <= _to) {
      return l;
   }

   const newLength = _to - _from;
   let prefixSize = getPrefixSize(l);
   const suffixSize = getSuffixSize(l);

   // Both indices lie in the prefix
   if (_to <= prefixSize) {
      return new List(
         setPrefix(newLength, 0),
         0,
         newLength,
         l.prefix.slice(prefixSize - _to, prefixSize - _from),
         undefined,
         emptyAffix
      );
   }

   const suffixStart = length - suffixSize;
   // Both indices lie in the suffix
   if (suffixStart <= _from) {
      return new List(
         setSuffix(newLength, 0),
         0,
         newLength,
         emptyAffix,
         undefined,
         l.suffix.slice(_from - suffixStart, _to - suffixStart)
      );
   }

   const newList = cloneList(l);
   newList.length = newLength;

   // Both indices lie in the tree
   if (prefixSize <= _from && _to <= suffixStart) {
      sliceTreeList(
         _from - prefixSize + l.offset,
         _to - prefixSize + l.offset - 1,
         l.root!,
         getDepth(l),
         l.offset,
         newList
      );
      return newList;
   }

   if (0 < _from) {
      // we need _to slice something off of the left
      if (_from < prefixSize) {
         // shorten the prefix even though it's not strictly needed,
         // so that referenced items can be GC'd
         newList.prefix = l.prefix.slice(0, prefixSize - _from);
         bits = setPrefix(prefixSize - _from, bits);
      } else {
         // if we're here `_to` can't lie in the tree, so we can set the
         // root
         zeroOffset();
         newList.root = sliceLeft(newList.root!, getDepth(l), _from - prefixSize, l.offset, true);
         newList.offset = newOffset;
         if (newList.root === undefined) {
            bits = setDepth(0, bits);
         }
         bits = setPrefix(newAffix.length, bits);
         prefixSize = newAffix.length;
         newList.prefix = newAffix;
      }
   }
   if (_to < length) {
      // we need _to slice something off of the right
      if (length - _to < suffixSize) {
         bits = setSuffix(suffixSize - (length - _to), bits);
         // slice the suffix even though it's not strictly needed,
         // _to allow the removed items _to be GC'd
         newList.suffix = l.suffix.slice(0, suffixSize - (length - _to));
      } else {
         newList.root = sliceRight(newList.root!, getDepth(l), _to - prefixSize - 1, newList.offset);
         if (newList.root === undefined) {
            bits = setDepth(0, bits);
            newList.offset = 0;
         }
         bits = setSuffix(newAffix.length, bits);
         newList.suffix = newAffix;
      }
   }
   newList.bits = bits;
   return newList;
}

/**
 * Returns a slice of a list. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the list.
 *
 * @complexity `O(log(n))`
 */
export function slice(from: number, to: number): <A>(l: List<A>) => List<A> {
   return (l) => slice_(l, from, to);
}

/**
 * Takes the first `n` elements from a list and returns them in a new list.
 *
 * @complexity `O(log(n))`
 */
export function take_<A>(l: List<A>, n: number): List<A> {
   return slice_(l, 0, n);
}

/**
 * Takes the first `n` elements from a list and returns them in a new list.
 *
 * @complexity `O(log(n))`
 */
export function take(n: number): <A>(l: List<A>) => List<A> {
   return (l) => take_(l, n);
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given list.
 *
 * @complexity O(n)
 */
export function every_<A>(l: List<A>, predicate: (a: A) => boolean): boolean {
   return foldlCb<A, PredState>(everyCb, { predicate, result: true }, l).result;
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given list.
 *
 * @complexity O(n)
 */
export function every<A>(predicate: (a: A) => boolean): (l: List<A>) => boolean {
   return (l) => every_(l, predicate);
}

/**
 * Returns true if and only if there exists an element in the list for
 * which the predicate returns true.
 *
 * @complexity O(n)
 */
export function some_<A>(l: List<A>, predicate: (a: A) => boolean): boolean {
   return foldlCb<A, PredState>(someCb, { predicate, result: false }, l).result;
}

/**
 * Returns true if and only if there exists an element in the list for
 * which the predicate returns true.
 *
 * @complexity O(n)
 */
export function some<A>(predicate: (a: A) => boolean): (l: List<A>) => boolean {
   return (l) => some_(l, predicate);
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given list.
 *
 * @complexity O(n)
 */
export function none_<A>(l: List<A>, predicate: (a: A) => boolean): boolean {
   return !some_(l, predicate);
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given list.
 *
 * @complexity O(n)
 */
export function none<A>(predicate: (a: A) => boolean): (l: List<A>) => boolean {
   return (l) => none_(l, predicate);
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFind_<A>(l: List<A>, predicate: (a: A) => boolean): A | undefined {
   return foldlCb<A, PredState>(findCb, { predicate, result: undefined }, l).result;
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFind<A>(predicate: (a: A) => boolean): (l: List<A>) => A | undefined {
   return (l) => unsafeFind_(l, predicate);
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function find_<A>(l: List<A>, predicate: (a: A) => boolean) {
   return O.fromNullable(unsafeFind_(l, predicate));
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function find<A>(predicate: (a: A) => boolean) {
   return (l: List<A>) => find_(l, predicate);
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFindLast_<A>(l: List<A>, predicate: (a: A) => boolean): A | undefined {
   return foldrCb<A, PredState>(findCb, { predicate, result: undefined }, l).result;
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFindLast<A>(predicate: (a: A) => boolean): (l: List<A>) => A | undefined {
   return (l) => unsafeFindLast_(l, predicate);
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function findLast_<A>(l: List<A>, predicate: (a: A) => boolean) {
   return O.fromNullable(unsafeFindLast_(l, predicate));
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function findLast<A>(predicate: (a: A) => boolean): (l: List<A>) => O.Option<A> {
   return (l) => findLast_(l, predicate);
}

/**
 * Returns the index of the _first_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function indexOf_<A>(l: List<A>, element: A): number {
   const state = { element, found: false, index: -1 };
   foldlCb(indexOfCb, state, l);
   return state.found ? state.index : -1;
}

/**
 * Returns the index of the _first_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function indexOf<A>(element: A): (l: List<A>) => number {
   return (l) => indexOf_(l, element);
}

/**
 * Returns the index of the _last_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function lastIndexOf_<A>(l: List<A>, element: A): number {
   const state = { element, found: false, index: 0 };
   foldrCb(indexOfCb, state, l);
   return state.found ? l.length - state.index : -1;
}

/**
 * Returns the index of the _last_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function lastIndexOf<A>(element: A): (l: List<A>) => number {
   return (l) => lastIndexOf_(l, element);
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 */
export function findIndex_<A>(l: List<A>, predicate: (a: A) => boolean): number {
   const { found, index } = foldlCb<A, FindIndexState>(findIndexCb, { predicate, found: false, index: -1 }, l);
   return found ? index : -1;
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 */
export function findIndex<A>(predicate: (a: A) => boolean): (l: List<A>) => number {
   return (l) => findIndex_(l, predicate);
}

/**
 * Returns `true` if the list contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 */
export function contains_<A>(l: List<A>, element: A): boolean {
   containsState.element = element;
   containsState.result = false;
   return foldlCb(containsCb, containsState, l).result;
}

/**
 * Returns `true` if the list contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 */
export function contains<A>(element: A): (l: List<A>) => boolean {
   return (l) => contains_(l, element);
}

/**
 * Returns true if the two lists are equivalent.
 *
 * @complexity O(n)
 */
export function equals_<A>(l1: List<A>, l2: List<A>): boolean {
   return equalsWith_(l1, l2, elementEquals);
}

/**
 * Returns true if the two lists are equivalent.
 *
 * @complexity O(n)
 */
export function equals<A>(l2: List<A>): (l1: List<A>) => boolean {
   return (l1) => equals_(l1, l2);
}

/**
 * Returns true if the two lists are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 */
export function equalsWith_<A>(l1: List<A>, l2: List<A>, f: (a: A, b: A) => boolean): boolean {
   if (l1 === l2) {
      return true;
   } else if (l1.length !== l2.length) {
      return false;
   } else {
      const s = { iterator: l2[Symbol.iterator](), equals: true, f };
      return foldlCb<A, EqualsState<A>>(equalsCb, s, l1).equals;
   }
}

/**
 * Returns true if the two lists are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 */
export function equalsWith<A>(l2: List<A>, f: (a: A, b: A) => boolean): (l1: List<A>) => boolean {
   return (l1) => equalsWith_(l1, l2, f);
}

/**
 * Takes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 */
export function takeWhile_<A>(l: List<A>, predicate: (a: A) => boolean): List<A> {
   const { index } = foldlCb(findNotIndexCb, { predicate, index: 0 }, l);
   return slice_(l, 0, index);
}

/**
 * Takes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 */
export function takeWhile<A>(predicate: (a: A) => boolean): (l: List<A>) => List<A> {
   return (l) => takeWhile_(l, predicate);
}

/**
 * Takes the last elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function takeLastWhile_<A>(l: List<A>, predicate: (a: A) => boolean): List<A> {
   const { index } = foldrCb(findNotIndexCb, { predicate, index: 0 }, l);
   return slice_(l, l.length - index, l.length);
}

/**
 * Takes the last elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function takeLastWhile<A>(predicate: (a: A) => boolean): (l: List<A>) => List<A> {
   return (l) => takeLastWhile_(l, predicate);
}

/**
 * Removes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function dropWhile_<A>(l: List<A>, predicate: (a: A) => boolean): List<A> {
   const { index } = foldlCb(findNotIndexCb, { predicate, index: 0 }, l);
   return slice_(l, index, l.length);
}

/**
 * Removes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function dropWhile<A>(predicate: (a: A) => boolean): (l: List<A>) => List<A> {
   return (l) => dropWhile_(l, predicate);
}

/**
 * Returns a new list without repeated elements.
 *
 * @complexity `O(n)`
 */
export function dropRepeats<A>(l: List<A>): List<A> {
   return dropRepeatsWith_(l, elementEquals);
}

/**
 * Returns a new list without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 */
export function dropRepeatsWith_<A>(l: List<A>, predicate: (a: A, b: A) => boolean): List<A> {
   return reduce_(l, emptyPushable(), (acc, a) =>
      acc.length !== 0 && predicate(unsafeLast(acc)!, a) ? acc : push(a, acc)
   );
}

/**
 * Returns a new list without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 */
export function dropRepeatsWith<A>(predicate: (a: A, b: A) => boolean): (l: List<A>) => List<A> {
   return (l) => dropRepeatsWith_(l, predicate);
}

/**
 * Takes the last `n` elements from a list and returns them in a new
 * list.
 *
 * @complexity `O(log(n))`
 */
export function takeLast_<A>(l: List<A>, n: number): List<A> {
   return slice_(l, l.length - n, l.length);
}

/**
 * Takes the last `n` elements from a list and returns them in a new
 * list.
 *
 * @complexity `O(log(n))`
 */
export function takeLast<A>(n: number): (l: List<A>) => List<A> {
   return (l) => takeLast_(l, n);
}

/**
 * Splits a list at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 */
export function splitAt_<A>(l: List<A>, index: number): [List<A>, List<A>] {
   return [slice_(l, 0, index), slice_(l, index, l.length)];
}

/**
 * Splits a list at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 */
export function splitAt(index: number): <A>(l: List<A>) => [List<A>, List<A>] {
   return (l) => splitAt_(l, index);
}

/**
 * Splits a list at the first element in the list for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 */
export function splitWhen_<A>(l: List<A>, predicate: (a: A) => boolean): [List<A>, List<A>] {
   const idx = findIndex_(l, predicate);
   return idx === -1 ? [l, empty()] : splitAt_(l, idx);
}

/**
 * Splits a list at the first element in the list for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 */
export function splitWhen<A>(predicate: (a: A) => boolean): (l: List<A>) => [List<A>, List<A>] {
   return (l) => splitWhen_(l, predicate);
}

/**
 * Splits the list into chunks of the given size.
 */
export function splitEvery_<A>(l: List<A>, size: number): List<List<A>> {
   const { buffer, l2 } = reduce_(
      l,
      { l2: emptyPushable<List<A>>(), buffer: emptyPushable<A>() },
      ({ buffer, l2 }, elm) => {
         push(elm, buffer);
         if (buffer.length === size) {
            return { l2: push(buffer, l2), buffer: emptyPushable<A>() };
         } else {
            return { l2, buffer };
         }
      }
   );
   return buffer.length === 0 ? l2 : push(buffer, l2);
}

/**
 * Splits the list into chunks of the given size.
 */
export function splitEvery(size: number): <A>(l: List<A>) => List<List<A>> {
   return (l) => splitEvery_(l, size);
}

/**
 * Takes an index, a number of elements to remove and a list. Returns a
 * new list with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 */
export function remove_<A>(l: List<A>, from: number, amount: number): List<A> {
   return concat_(slice_(l, 0, from), slice_(l, from + amount, l.length));
}

/**
 * Takes an index, a number of elements to remove and a list. Returns a
 * new list with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 */
export function remove(from: number, amount: number): <A>(l: List<A>) => List<A> {
   return (l) => remove_(l, from, amount);
}

/**
 * Returns a new list without the first `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function drop_<A>(l: List<A>, n: number): List<A> {
   return slice_(l, n, l.length);
}

/**
 * Returns a new list without the first `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function drop(n: number): <A>(l: List<A>) => List<A> {
   return (l) => drop_(l, n);
}

/**
 * Returns a new list without the last `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function dropLast_<A>(l: List<A>, n: number): List<A> {
   return slice_(l, 0, l.length - n);
}

/**
 * Returns a new list without the last `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function dropLast<A>(n: number): (l: List<A>) => List<A> {
   return (l) => dropLast_(l, n);
}

/**
 * Returns a new list with the last element removed. If the list is
 * empty the empty list is returned.
 *
 * @complexity `O(1)`
 */
export function pop<A>(l: List<A>): List<A> {
   return slice_(l, 0, -1);
}

/**
 * Returns a new list with the first element removed. If the list is
 * empty the empty list is returned.
 *
 * @complexity `O(1)`
 */
export function tail<A>(l: List<A>): List<A> {
   return slice_(l, 1, l.length);
}

/**
 * Folds a function over a list from left to right while collecting
 * all the intermediate steps in a resulting list.
 */
export function scan_<A, B>(l: List<A>, initial: B, f: (acc: B, value: A) => B): List<B> {
   return reduce_(l, push(initial, emptyPushable<B>()), (l2, a) => push(f(unsafeLast(l2)!, a), l2));
}

/**
 * Folds a function over a list from left to right while collecting
 * all the intermediate steps in a resulting list.
 */
export function scan<A, B>(initial: B, f: (acc: B, value: A) => B): (l: List<A>) => List<B> {
   return (l) => scan_(l, initial, f);
}

/**
 * Inserts the given element at the given index in the list.
 *
 * @complexity O(log(n))
 */
export function insert_<A>(l: List<A>, index: number, element: A): List<A> {
   return concat_(append_(slice_(l, 0, index), element), slice_(l, index, l.length));
}

/**
 * Inserts the given element at the given index in the list.
 *
 * @complexity O(log(n))
 */
export function insert<A>(index: number, element: A): (l: List<A>) => List<A> {
   return (l) => insert_(l, index, element);
}

/**
 * Inserts the given list of elements at the given index in the list.
 *
 * @complexity `O(log(n))`
 */
export function insertAll_<A>(l: List<A>, index: number, elements: List<A>): List<A> {
   return concat_(concat_(slice_(l, 0, index), elements), slice_(l, index, l.length));
}

/**
 * Inserts the given list of elements at the given index in the list.
 *
 * @complexity `O(log(n))`
 */
export function insertAll<A>(index: number, elements: List<A>): (l: List<A>) => List<A> {
   return (l) => insertAll_(l, index, elements);
}

/**
 * Reverses a list.
 * @complexity O(n)
 */
export function reverse<A>(l: List<A>): List<A> {
   return reduce_(l, empty(), (newL, element) => prepend_(newL, element));
}

/**
 * Invokes a given callback for each element in the list from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new list `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new list is unneeded.
 *
 * @complexity O(n)
 */
export function forEach_<A>(l: List<A>, callback: (a: A) => void): void {
   reduce_(l, undefined as void, (_, element) => callback(element));
}

/**
 * Invokes a given callback for each element in the list from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new list `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new list is unneeded.
 *
 * @complexity O(n)
 */
export function forEach<A>(callback: (a: A) => void): (l: List<A>) => void {
   return (l) => forEach_(l, callback);
}

/**
 * Sort the given list by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 */
export function sortWith_<A>(l: List<A>, comparator: (a: A, b: A) => Ordering): List<A> {
   const arr: { idx: number; elm: A }[] = [];
   let i = 0;
   forEach_(l, (elm) => arr.push({ idx: i++, elm }));
   arr.sort(({ elm: a, idx: i }, { elm: b, idx: j }) => {
      const c = toNumber(comparator(a, b));
      return c !== 0 ? c : i < j ? -1 : 1;
   });
   const newL = emptyPushable<A>();
   for (let i = 0; i < arr.length; ++i) {
      push(arr[i].elm, newL);
   }
   return newL;
}

/**
 * Sort the given list by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 */
export function sortWith<A>(comparator: (a: A, b: A) => Ordering): (l: List<A>) => List<A> {
   return (l) => sortWith_(l, comparator);
}

/**
 * Returns a list of lists where each sublist's elements are all
 * equal.
 */
export function group<A>(l: List<A>): List<List<A>> {
   return groupWith_(l, elementEquals);
}

/**
 * Returns a list of lists where each sublist's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the list should be sorted
 * before grouping.
 */
export function groupWith_<A>(l: List<A>, f: (a: A, b: A) => boolean): List<List<A>> {
   const result = emptyPushable<MutableList<A>>();
   let buffer = emptyPushable<A>();
   forEach_(l, (a) => {
      if (buffer.length !== 0 && !f(unsafeLast(buffer)!, a)) {
         push(buffer, result);
         buffer = emptyPushable();
      }
      push(a, buffer);
   });
   return buffer.length === 0 ? result : push(buffer, result);
}

/**
 * Returns a list of lists where each sublist's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the list should be sorted
 * before grouping.
 */
export function groupWith<A>(f: (a: A, b: A) => boolean): (l: List<A>) => List<List<A>> {
   return (l) => groupWith_(l, f);
}

/**
 * Inserts a separator between each element in a list.
 */
export function intersperse_<A>(l: List<A>, separator: A): List<A> {
   return pop(reduce_(l, emptyPushable(), (l2, a) => push(separator, push(a, l2))));
}

/**
 * Inserts a separator between each element in a list.
 */
export function intersperse<A>(separator: A): (l: List<A>) => List<A> {
   return (l) => intersperse_(l, separator);
}
