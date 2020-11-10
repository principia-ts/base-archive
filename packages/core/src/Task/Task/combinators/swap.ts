import { foldM_, pure } from "../_core";
import type { Task } from "../model";

/**
 * ```haskell
 * swap :: Bifunctor p => p a b -> p b a
 * ```
 *
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category AltBifunctor?
 * @since 1.0.0
 */
export const swap = <R, E, A>(pab: Task<R, E, A>): Task<R, A, E> => foldM_(pab, pure, fail);
