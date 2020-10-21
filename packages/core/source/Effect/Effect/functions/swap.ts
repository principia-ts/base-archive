import { foldM_, pure } from "../core";
import type { Effect } from "../model";

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
export const swap = <R, E, A>(pab: Effect<R, E, A>): Effect<R, A, E> => foldM_(pab, pure, fail);
