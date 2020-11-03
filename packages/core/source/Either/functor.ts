import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { right } from "./constructors";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_ = <E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> => (isLeft(fa) ? fa : right(f(fa.right)));

/**
 * ```haskell
 * map :: functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>): Either<E, B> => map_(fa, f);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_
});
