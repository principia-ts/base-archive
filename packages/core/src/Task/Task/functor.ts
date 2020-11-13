import { succeed } from "./constructors";
import type { Task } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Functor Task
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `Task` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<R, E, A, B>(fa: Task<R, E, A>, f: (a: A) => B): Task<R, E, B> {
   return chain_(fa, (a) => succeed(f(a)));
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `Task` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Task<R, E, A>) => Task<R, E, B> {
   return (fa) => map_(fa, f);
}
