import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { some } from "./constructors";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Option
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
export const map_ = <A, B>(fa: Option<A>, f: (a: A) => B): Option<B> => (isNone(fa) ? fa : some(f(fa.value)));

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => (fa: Option<A>): Option<B> => map_(fa, f);

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});
