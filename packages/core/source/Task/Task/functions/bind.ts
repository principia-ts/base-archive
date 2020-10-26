import { chain_ } from "../core";
import type { Task } from "../model";

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are interchanged
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns a task that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind = <R, E, A>(ma: Task<R, E, A>) => <U, G, B>(f: (a: A) => Task<U, G, B>): Task<R & U, E | G, B> =>
   chain_(ma, f);
