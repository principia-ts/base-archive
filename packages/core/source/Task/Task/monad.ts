import { identity, pipe } from "../../Function";
import { succeed } from "./constructors";
import type { Task } from "./model";
import { ChainInstruction } from "./model";

/*
 * -------------------------------------------
 * Monad Task
 * -------------------------------------------
 */

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns a task that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_ = <R, E, A, U, G, B>(ma: Task<R, E, A>, f: (a: A) => Task<U, G, B>): Task<R & U, E | G, B> =>
   new ChainInstruction(ma, f);

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns a task that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain = <A, U, G, B>(f: (a: A) => Task<U, G, B>) => <R, E>(ma: Task<R, E, A>): Task<R & U, E | G, B> =>
   chain_(ma, f);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Task`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten = <R, E, Q, D, A>(ffa: Task<R, E, Task<Q, D, A>>) => chain_(ffa, identity);

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns a task that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap_ = <R, E, A, Q, D, B>(fa: Task<R, E, A>, f: (a: A) => Task<Q, D, B>): Task<Q & R, D | E, A> =>
   chain_(fa, (a) =>
      pipe(
         f(a),
         chain(() => succeed(a))
      )
   );

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns a task that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap = <A, Q, D, B>(f: (a: A) => Task<Q, D, B>) => <R, E>(fa: Task<R, E, A>): Task<Q & R, D | E, A> =>
   tap_(fa, f);
