import type { Lazy } from "../Function";
import { isNothing } from "./guards";
import type { Maybe } from "./Maybe";

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * _fold :: (Maybe a, (() -> b), (a -> c)) -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Maybe` value, if the `Maybe` value is `Nothing` the default value is returned, otherwise the function is applied to the value inside the `Just` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export const _fold = <A, B, C>(fa: Maybe<A>, onNothing: Lazy<B>, onJust: (a: A) => C): B | C =>
   isNothing(fa) ? onNothing() : onJust(fa.value);

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
export const fold = <A, B, C>(onNothing: Lazy<B>, onJust: (a: A) => C) => (fa: Maybe<A>): B | C =>
   _fold(fa, onNothing, onJust);

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
export const toNullable = <A>(fa: Maybe<A>): A | null => (isNothing(fa) ? null : fa.value);

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
export const toUndefined = <A>(fa: Maybe<A>): A | undefined => (isNothing(fa) ? undefined : fa.value);

/**
 * ```haskell
 * _getOrElse :: (Maybe a, (() -> b)) -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export const _getOrElse = <A, B>(fa: Maybe<A>, onNothing: Lazy<B>): A | B => (isNothing(fa) ? onNothing() : fa.value);

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
export const getOrElse = <B>(onNothing: Lazy<B>) => <A>(fa: Maybe<A>): A | B => _getOrElse(fa, onNothing);
