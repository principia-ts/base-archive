import { identity } from "../Function";
import { isLeft } from "./guards";
import type { Either } from "./model";

/*
 * -------------------------------------------
 * Either Destructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * _fold :: (Either e a, (e -> b), (a -> c)) -> b | c
 * ```
 *
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold_<E, A, B, C>(pab: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C {
   return isLeft(pab) ? onLeft(pab.left) : onRight(pab.right);
}

/**
 * ```haskell
 * fold :: ((e -> b), (a -> c)) -> Either e a -> b | c
 * ```
 *
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold<E, A, B, C>(onLeft: (e: E) => B, onRight: (a: A) => C): (pab: Either<E, A>) => B | C {
   return (pab) => fold_(pab, onLeft, onRight);
}

/**
 * ```haskell
 * either :: ((e -> b), (a -> c)) -> Either e a -> b | c
 * ```
 */
export const either = fold;

/**
 * ```haskell
 * _getOrElse :: (Either e a, (e -> b)) -> a | b
 * ```
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse_<E, A, B>(pab: Either<E, A>, onLeft: (e: E) => B): A | B {
   return isLeft(pab) ? onLeft(pab.left) : pab.right;
}

/**
 * ```haskell
 * _getOrElse :: (e -> b) -> Either e a -> a | b
 * ```
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse<E, A, B>(f: (e: E) => B): (pab: Either<E, A>) => A | B {
   return (pab) => getOrElse_(pab, f);
}

/**
 * ```haskell
 * merge :: Either e a -> e | a
 * ```
 *
 * @category Destructors
 * @since 1.0.0
 */
export function merge<E, A>(pab: Either<E, A>): E | A {
   return fold_(pab, identity, identity as any);
}
