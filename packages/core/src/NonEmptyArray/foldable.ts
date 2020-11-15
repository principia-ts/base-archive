import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import type { NonEmptyArray, URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, b, a) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (i: number, b: B, a: A) => B) => B =
   A.reduceWithIndex_;

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex: <A, B>(b: B, f: (i: number, b: B, a: A) => B) => (fa: NonEmptyArray<A>) => B =
   A.reduceWithIndex;

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B) => B = A.reduce_;

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: NonEmptyArray<A>) => B = A.reduce;

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (i: number, a: A, b: B) => B) => B =
   A.reduceRightWithIndex_;

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex: <A, B>(b: B, f: (i: number, a: A, b: B) => B) => (fa: NonEmptyArray<A>) => B =
   A.reduceRightWithIndex;

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B) => B = A.reduceRight_;

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: NonEmptyArray<A>) => B = A.reduceRight;

/**
 * ```haskell
 * foldMapWithIndex_ :: (Semigroup s, FoldableWithIndex f, Index k) =>
 *    s b -> (f a, ((k, a) -> b) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function foldMapWithIndex_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => S) => S {
   return (fa, f) => A.reduceWithIndex_(fa.slice(1), f(0, fa[0]), (i, s, a) => S.combine_(s, f(i + 1, a)));
}

/**
 * ```haskell
 * foldMapWithIndex :: (Semigroup s, FoldableWithIndex f, Index k) =>
 *    s b -> ((k, a) -> b) -> f a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function foldMapWithIndex<S>(S: P.Semigroup<S>): <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>) => S {
   return (f) => (fa) => foldMapWithIndex_(S)(fa, f);
}

/**
 * ```haskell
 * foldMap_ :: (Semigroup s, Foldable f) => s b -> (f a, (a -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (a: A) => S) => S {
   return (fa, f) => A.reduce_(fa.slice(1), f(fa[0]), (s, a) => S.combine_(s, f(a)));
}

/**
 * ```haskell
 * foldMap :: (Semigroup s, Foldable f) => s b -> (a -> b) -> f a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap<S>(S: P.Semigroup<S>): <A>(f: (a: A) => S) => (fa: NonEmptyArray<A>) => S {
   return (f) => (fa) => foldMap_(S)(fa, f);
}

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   foldMap_: foldMap_,
   reduceRight_: reduceRight_,
   reduce,
   foldMap,
   reduceRight
});

export const FoldableWithIndex: P.FoldableWithIndex<[URI], V> = HKT.instance({
   ...Foldable,
   reduceWithIndex_: reduceWithIndex_,
   foldMapWithIndex_: foldMapWithIndex_,
   reduceRightWithIndex_: reduceRightWithIndex_,
   reduceWithIndex,
   foldMapWithIndex,
   reduceRightWithIndex
});
