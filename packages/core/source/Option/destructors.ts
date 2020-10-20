import { isNone } from "./guards";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fold_ :: (Maybe a, (() -> b), (a -> c)) -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Maybe` value, if the `Maybe` value is `Nothing` the default value is returned, otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const fold_ = <A, B, C>(fa: Option<A>, onNothing: () => B, onJust: (a: A) => C): B | C =>
   isNone(fa) ? onNothing() : onJust(fa.value);

/**
 * ```haskell
 * fold :: ((() -> b), (a -> c)) -> Maybe a -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Maybe` value, if the `Maybe` value is `Nothing` the default value is returned, otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const fold = <A, B, C>(onNothing: () => B, onJust: (a: A) => C) => (fa: Option<A>): B | C =>
   fold_(fa, onNothing, onJust);

/**
 * ```haskell
 * toNullable :: Maybe a -> a | Null
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const toNullable = <A>(fa: Option<A>): A | null => (isNone(fa) ? null : fa.value);

/**
 * ```haskell
 * toUndefined :: Maybe a -> a | Undefined
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const toUndefined = <A>(fa: Option<A>): A | undefined => (isNone(fa) ? undefined : fa.value);

/**
 * ```haskell
 * getOrElse_ :: (Maybe a, (() -> b)) -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export const getOrElse_ = <A, B>(fa: Option<A>, onNothing: () => B): A | B => (isNone(fa) ? onNothing() : fa.value);

/**
 * ```haskell
 * getOrElse :: (() -> b) -> Maybe a -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export const getOrElse = <B>(onNothing: () => B) => <A>(fa: Option<A>): A | B => getOrElse_(fa, onNothing);
