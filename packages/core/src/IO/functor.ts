import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { succeed } from "./constructors";
import type { IO, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Functor IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<R, E, A, B>(fa: IO<R, E, A>, f: (a: A) => B): IO<R, E, B> {
  return chain_(fa, (a) => succeed(f(a)));
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: IO<R, E, A>) => IO<R, E, B> {
  return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map_,
  map
});
