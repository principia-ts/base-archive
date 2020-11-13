import type { Cause } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Alt Cause
 * -------------------------------------------
 */

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E>(fa: Cause<E>, that: () => Cause<E>): Cause<E> {
   return chain_(fa, () => that());
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> fa -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<E>(that: () => Cause<E>): (fa: Cause<E>) => Cause<E> {
   return (fa) => alt_(fa, that);
}
