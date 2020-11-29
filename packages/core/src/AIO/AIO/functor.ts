import { succeed } from "./constructors";
import type { AIO } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Functor AIO
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `AIO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<R, E, A, B>(fa: AIO<R, E, A>, f: (a: A) => B): AIO<R, E, B> {
  return chain_(fa, (a) => succeed(f(a)));
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `AIO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: AIO<R, E, A>) => AIO<R, E, B> {
  return (fa) => map_(fa, f);
}
