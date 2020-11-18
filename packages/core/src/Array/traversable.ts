import type * as P from "@principia/prelude";
import * as TC from "@principia/prelude";
import { apF_, identity, pureF } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { snoc_ } from "./combinators";
import { empty } from "./constructors";
import { reduceWithIndex_ } from "./foldable";
import { Functor, FunctorWithIndex } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> (t a, ((k, a) -> g b))
 *    -> g (t b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex_: TC.TraverseWithIndexFn_<[URI], V> = TC.implementTraverseWithIndex_<
  [URI],
  V
>()((_) => (G) => {
  const ap_ = apF_(G);
  const pure = pureF(G);
  return (ta, f) =>
    reduceWithIndex_(ta, pure(empty<typeof _.B>()), (i, fbs, a) =>
      ap_(
        G.map_(fbs, (bs) => (b: typeof _.B) => snoc_(bs, b)),
        f(i, a)
      )
    );
});

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> ((k, a) -> g b)
 *    -> t a
 *    -> g (t b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex: TC.TraverseWithIndexFn<[URI], V> = (G) => {
  const traverseWithIndexG_ = traverseWithIndex_(G);
  return (f) => (ta) => traverseWithIndexG_(ta, f);
};

/**
 * ```haskell
 * traverse_ :: (Applicative g, Traversable t) =>
 *    g
 *    -> (t a, (a -> g b))
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: TC.TraverseFn_<[URI], V> = (G) => {
  const traverseWithIndexG_ = traverseWithIndex_(G);
  return (ta, f) => traverseWithIndexG_(ta, (_, a) => f(a));
};

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g
 *    -> (a -> g b)
 *    -> t a
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: TC.TraverseFn<[URI], V> = (G) => {
  const traverseWithIndexG_ = traverseWithIndex_(G);
  return (f) => (ta) => traverseWithIndexG_(ta, (_, a) => f(a));
};

/**
 * ```haskell
 * sequence :: (Applicative g, Traversable t) => g -> t a -> g (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: TC.SequenceFn<[URI], V> = TC.implementSequence<[URI], V>()((_) => (G) => {
  const traverseG = traverse(G);
  return traverseG(identity);
});

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
});

export const TraversableWithIndex: P.TraversableWithIndex<[URI], V> = HKT.instance({
  ...FunctorWithIndex,
  traverseWithIndex_,
  traverseWithIndex
});
