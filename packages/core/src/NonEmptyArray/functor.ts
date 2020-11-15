import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import type { NonEmptyArray, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map a `NonEmptyArray` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex_: <A, B>(
   fa: NonEmptyArray<A>,
   f: (i: number, a: A) => B
) => NonEmptyArray<B> = A.mapWithIndex_ as any;

/**
 * ```haskell
 * mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map a `NonEmptyArray` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex: <A, B>(
   f: (i: number, a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.mapWithIndex as any;

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map over a `NonEmptyArray` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_: <A, B>(fa: NonEmptyArray<A>, f: (a: A) => B) => NonEmptyArray<B> = A.map_ as any;

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Map over a `NonEmptyArray` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map: <A, B>(f: (a: A) => B) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.map as any;

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_
});

export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_
});
