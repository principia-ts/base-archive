import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) => (f a, ((k, a) -> b)) -> f b
 * ```
 *
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex_ = <A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => B): ReadonlyArray<B> => {
   const len = fa.length;
   const bs = new Array(len);
   for (let i = 0; i < len; i++) {
      bs[i] = f(i, fa[i]);
   }
   return bs;
};

/**
 * ```haskell
 * mapWithIndex :: (FunctorWithIndex f, Index k) => ((k, a) -> b) -> f a -> f b
 * ```
 *
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex = <A, B>(f: (i: number, a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   mapWithIndex_(fa, f);

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_ = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> => mapWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => map_(fa, f);

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});
