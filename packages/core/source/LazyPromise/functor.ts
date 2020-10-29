import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { LazyPromise, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor LazyPromise
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
export const map_ = <A, B>(fa: LazyPromise<A>, f: (a: A) => B): LazyPromise<B> => () => fa().then(f);

/**
 * ```haskell
 * map :: functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => (fa: LazyPromise<A>): LazyPromise<B> => map_(fa, f);

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_,
   map
});
