import { isNone } from "./guards";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fold_ :: (Option a, (() -> b), (a -> c)) -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `Nothing` the default value is returned, otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold_<A, B, C>(fa: Option<A>, onNothing: () => B, onJust: (a: A) => C): B | C {
   return isNone(fa) ? onNothing() : onJust(fa.value);
}

/**
 * ```haskell
 * fold :: ((() -> b), (a -> c)) -> Option a -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `Nothing` the default value is returned, otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold<A, B, C>(onNothing: () => B, onJust: (a: A) => C): (fa: Option<A>) => B | C {
   return (fa) => fold_(fa, onNothing, onJust);
}

/**
 * ```haskell
 * toNullable :: Option a -> a | Null
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toNullable<A>(fa: Option<A>): A | null {
   return isNone(fa) ? null : fa.value;
}

/**
 * ```haskell
 * toUndefined :: Option a -> a | Undefined
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUndefined<A>(fa: Option<A>): A | undefined {
   return isNone(fa) ? undefined : fa.value;
}

/**
 * ```haskell
 * getOrElse_ :: (Option a, (() -> b)) -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse_<A, B>(fa: Option<A>, onNothing: () => B): A | B {
   return isNone(fa) ? onNothing() : fa.value;
}

/**
 * ```haskell
 * getOrElse :: (() -> b) -> Option a -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse<B>(onNothing: () => B): <A>(fa: Option<A>) => B | A {
   return (fa) => getOrElse_(fa, onNothing);
}
