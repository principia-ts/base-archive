import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import { Functor, FunctorWithIndex } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> (t k a, ((k, a) -> g b))
 *    -> g (t k b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex_: P.TraverseWithIndexFn_<[URI], V> = A.traverseWithIndex_ as any;

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> ((k, a) -> g b)
 *    -> t k a
 *    -> g (t k b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex: P.TraverseWithIndexFn<[URI], V> = A.traverseWithIndex as any;

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
export const traverse_: P.TraverseFn_<[URI], V> = A.traverse_ as any;

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g
 *    -> (a -> g b)
 *    -> g a
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[URI], V> = A.traverse as any;

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[URI], V> = A.sequence as any;

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
