import type { Effect } from "../Effect";
import { swap } from "./swap";

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 */
export const swapWith_ = <R, E, A, R1, E1, A1>(fa: Effect<R, E, A>, f: (ef: Effect<R, A, E>) => Effect<R1, A1, E1>) =>
   swap(f(swap(fa)));

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 */
export const swapWith = <R, E, A, R1, E1, A1>(f: (ef: Effect<R, A, E>) => Effect<R1, A1, E1>) => (
   fa: Effect<R, E, A>
) => swapWith_(fa, f);
