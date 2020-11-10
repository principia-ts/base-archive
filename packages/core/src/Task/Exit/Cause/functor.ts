import { fail } from "./constructors";
import type { Cause } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Functor Cause
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
export const map_ = <E, D>(fa: Cause<E>, f: (e: E) => D) => chain_(fa, (e) => fail(f(e)));

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <E, D>(f: (e: E) => D) => (fa: Cause<E>) => map_(fa, f);
