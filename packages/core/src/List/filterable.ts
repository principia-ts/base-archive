import type * as E from "../Either";
import type { Predicate, Refinement } from "../Function";
import type * as O from "../Option";
import type { Separated } from "../Utils";
import { push } from "./_internal";
import { emptyPushable } from "./constructors";
import { reduce_ } from "./foldable";
import type { List, MutableList } from "./model";

/**
 * Returns a new list that only contains the elements of the original
 * list for which the predicate returns `true`.
 *
 * @complexity O(n)
 */
export function filter_<A, B extends A>(fa: List<A>, refinement: Refinement<A, B>): List<B>;
export function filter_<A>(fa: List<A>, predicate: Predicate<A>): List<A>;
export function filter_<A>(fa: List<A>, predicate: (a: A) => boolean): List<A> {
  return reduce_(fa, emptyPushable(), (acc, a) => (predicate(a) ? push(a, acc) : acc));
}

/**
 * Returns a new list that only contains the elements of the original
 * list for which the predicate returns `true`.
 *
 * @complexity O(n)
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: List<A>) => List<B>;
export function filter<A>(predicate: Predicate<A>): (fa: List<A>) => List<A>;
export function filter<A>(predicate: (a: A) => boolean): (fa: List<A>) => List<A> {
  return (fa) => filter_(fa, predicate);
}

/**
 * Returns a new list that only contains the elements of the original
 * list for which the f returns `Some`.
 *
 * @complexity O(n)
 */
export function filterMap_<A, B>(fa: List<A>, f: (a: A) => O.Option<B>): List<B> {
  return reduce_(fa, emptyPushable(), (acc, a) => {
    const fa = f(a);
    if (fa._tag === "Some") {
      push(fa.value, acc);
    }
    return acc;
  });
}

/**
 * Returns a new list that only contains the elements of the original
 * list for which the f returns `Some`.
 *
 * @complexity O(n)
 */
export function filterMap<A, B>(f: (a: A) => O.Option<B>): (fa: List<A>) => List<B> {
  return (fa) => filterMap_(fa, f);
}

/**
 * Splits the list into two lists. One list that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 */
export function partition_<A, B extends A>(
  l: List<A>,
  refinement: Refinement<A, B>
): Separated<List<B>, List<Exclude<A, B>>>;
export function partition_<A>(l: List<A>, predicate: Predicate<A>): Separated<List<A>, List<A>>;
export function partition_<A>(
  l: List<A>,
  predicate: (a: A) => boolean
): Separated<List<A>, List<A>> {
  return reduce_(
    l,
    { left: emptyPushable<A>(), right: emptyPushable<A>() } as Separated<
      MutableList<A>,
      MutableList<A>
    >,
    (arr, a) => (predicate(a) ? push(a, arr.left) : push(a, arr.right), arr)
  );
}

/**
 * Splits the list into two lists. One list that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (l: List<A>) => Separated<List<B>, List<Exclude<A, B>>>;
export function partition<A>(predicate: Predicate<A>): (l: List<A>) => Separated<List<A>, List<A>>;
export function partition<A>(
  predicate: (a: A) => boolean
): (l: List<A>) => Separated<List<A>, List<A>> {
  return (l) => partition_(l, predicate);
}

/**
 * Splits the list into two lists. One list that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function partitionMap_<A, B, C>(
  l: List<A>,
  f: (a: A) => E.Either<B, C>
): Separated<List<B>, List<C>> {
  return reduce_(
    l,
    { left: emptyPushable<B>(), right: emptyPushable<C>() } as Separated<
      MutableList<B>,
      MutableList<C>
    >,
    (arr, a) => {
      const fa = f(a);
      if (fa._tag === "Left") {
        push(fa.left, arr.left);
      } else {
        push(fa.right, arr.right);
      }
      return arr;
    }
  );
}

/**
 * Splits the list into two lists. One list that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function partitionMap<A, B, C>(
  f: (_: A) => E.Either<B, C>
): (l: List<A>) => Separated<List<B>, List<C>> {
  return (l) => partitionMap_(l, f);
}
