import { zipWith_ } from "./apply";
import type { List } from "./model";

/**
 * Iterate over two lists in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * list.
 */
export function zip_<A, B>(as: List<A>, bs: List<B>): List<readonly [A, B]> {
  return zipWith_(as, bs, (a, b) => [a, b] as [A, B]);
}

/**
 * Iterate over two lists in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * list.
 */
export function zip<B>(bs: List<B>): <A>(as: List<A>) => List<readonly [A, B]> {
  return (as) => zip_(as, bs);
}
