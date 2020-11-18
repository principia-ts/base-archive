import { concat_ } from "./combinators";
import { empty } from "./constructors";
import { reduce_ } from "./foldable";
import { map_ } from "./functor";
import type { List } from "./model";

/**
 * Flattens a list of lists into a list. Note that this function does
 * not flatten recursively. It removes one level of nesting only.
 *
 * @complexity O(n * log(m)), where n is the length of the outer list and m the length of the inner lists.
 */
export function flatten<A>(nested: List<List<A>>): List<A> {
  return reduce_<List<A>, List<A>>(nested, empty(), concat_);
}

/**
 * Maps a function over a list and concatenates all the resulting
 * lists together.
 */
export function chain_<A, B>(l: List<A>, f: (a: A) => List<B>): List<B> {
  return flatten(map_(l, f));
}

/**
 * Maps a function over a list and concatenates all the resulting
 * lists together.
 */
export function chain<A, B>(f: (a: A) => List<B>): (l: List<A>) => List<B> {
  return (l) => chain_(l, f);
}
