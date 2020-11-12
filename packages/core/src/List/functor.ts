import { getDepth, getPrefixSize, getSuffixSize, mapAffix, mapNode, mapPrefix } from "./_internal";
import { List } from "./model";

/*
 * -------------------------------------------
 * Functor List
 * -------------------------------------------
 */

/**
 * Applies a function to each element in the given list and returns a
 * new list of the values that the function return.
 *
 * @complexity O(n)
 */
export function map_<A, B>(l: List<A>, f: (a: A) => B): List<B> {
   return new List(
      l.bits,
      l.offset,
      l.length,
      mapPrefix(f, l.prefix, getPrefixSize(l)),
      l.root === undefined ? undefined : mapNode(f, l.root, getDepth(l)),
      mapAffix(f, l.suffix, getSuffixSize(l))
   );
}

/**
 * Applies a function to each element in the given list and returns a
 * new list of the values that the function return.
 *
 * @complexity O(n)
 */
export function map<A, B>(f: (a: A) => B): (l: List<A>) => List<B> {
   return (l) => map_(l, f);
}
