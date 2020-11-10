import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { left, right } from "./constructors";
import { Functor, map, map_ } from "./functor";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * swap :: Bifunctor p => p a b -> p b a
 * ```
 *
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category AltBifunctor
 * @since 1.0.0
 */
export const swap = <E, A>(pab: Either<E, A>): Either<A, E> => (isLeft(pab) ? right(pab.left) : left(pab.right));

/**
 * ```haskell
 * bimap_ :: Bifunctor p => (p a b, (a -> c), (b -> d)) -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const bimap_ = <E, A, G, B>(pab: Either<E, A>, f: (e: E) => G, g: (a: A) => B): Either<G, B> =>
   isLeft(pab) ? left(f(pab.left)) : right(g(pab.right));

/**
 * ```haskell
 * bimap :: Bifunctor p => ((a -> c), (b -> d)) -> p a b -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const bimap = <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => (pab: Either<E, A>): Either<G, B> =>
   bimap_(pab, f, g);

/**
 * ```haskell
 * mapLeft_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const mapLeft_ = <E, A, G>(pab: Either<E, A>, f: (e: E) => G): Either<G, A> =>
   isLeft(pab) ? left(f(pab.left)) : pab;

/**
 * ```haskell
 * mapLeft :: Bifunctor p => (a -> c) -> p a b -> p c b
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const mapLeft = <E, G>(f: (e: E) => G) => <A>(pab: Either<E, A>): Either<G, A> => mapLeft_(pab, f);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
   ...Functor,
   bimap_,
   bimap,
   mapLeft_,
   mapLeft
});
