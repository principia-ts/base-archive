import { map_ } from "./functor";
import type { Cause } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Cause
 * -------------------------------------------
 */

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<E, D>(fab: Cause<(a: E) => D>, fa: Cause<E>): Cause<D> {
   return chain_(fab, (f) => map_(fa, f));
}

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<E>(fa: Cause<E>): <D>(fab: Cause<(a: E) => D>) => Cause<D> {
   return (fab) => ap_(fab, fa);
}
