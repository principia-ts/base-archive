import { flow } from "../../Function";
import * as C from "../Exit/Cause";
import { fail, halt, succeed } from "./constructors";
import { foldCauseM_, foldM_ } from "./fold";
import type { Task } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Task
 * -------------------------------------------
 */

export const bimap_ = <R, E, A, G, B>(pab: Task<R, E, A>, f: (e: E) => G, g: (a: A) => B): Task<R, G, B> =>
   foldM_(
      pab,
      (e) => fail(f(e)),
      (a) => succeed(g(a))
   );

export const bimap = <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => <R>(pab: Task<R, E, A>): Task<R, G, B> =>
   bimap_(pab, f, g);

/**
 * ```haskell
 * mapError_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns a task with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const mapError_ = <R, E, A, D>(fea: Task<R, E, A>, f: (e: E) => D): Task<R, D, A> =>
   foldCauseM_(fea, flow(C.map(f), halt), succeed);

/**
 * ```haskell
 * mapError :: Bifunctor p => (a -> b) -> p a c -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns a task with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const mapError = <E, D>(f: (e: E) => D) => <R, A>(fea: Task<R, E, A>) => mapError_(fea, f);
