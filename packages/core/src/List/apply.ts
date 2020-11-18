import { map_ } from "./functor";
import type { List } from "./model";
import { flatten } from "./monad";

/*
 * -------------------------------------------
 * Apply List
 * -------------------------------------------
 */

/**
 * Applies a list of functions to a list of values.
 */
export function ap_<A, B>(fab: List<(a: A) => B>, fa: List<A>): List<B> {
  return flatten(map_(fab, (f) => map_(fa, f)));
}

/**
 * Applies a list of functions to a list of values.
 */
export function ap<A, B>(fa: List<A>): (fab: List<(a: A) => B>) => List<B> {
  return (fab) => ap_(fab, fa);
}

/**
 * This is like mapping over two lists at the same time. The two lists
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new list.
 *
 * The shortest list determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * list.
 */
export function zipWith_<A, B, C>(as: List<A>, bs: List<B>, f: (a: A, b: B) => C): List<C> {
  const swapped = bs.length < as.length;
  const iterator = (swapped ? as : bs)[Symbol.iterator]();
  return map_((swapped ? bs : as) as any, (a: any) => {
    const b: any = iterator.next().value;
    return swapped ? f(b, a) : f(a, b);
  });
}

/**
 * This is like mapping over two lists at the same time. The two lists
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new list.
 *
 * The shortest list determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * list.
 */
export function zipWith<A, B, C>(bs: List<B>, f: (a: A, b: B) => C): (as: List<A>) => List<C> {
  return (as) => zipWith_(as, bs, f);
}
