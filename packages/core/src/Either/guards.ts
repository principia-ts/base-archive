import type { Either, Left, Right } from "./model";

/*
 * -------------------------------------------
 * Either Typeguards
 * -------------------------------------------
 */

/**
 * ```haskell
 * isLeft :: Either e a -> is Left e
 * ```
 *
 * Returns `true` if the either is an instance of `Left`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isLeft<E, A>(fa: Either<E, A>): fa is Left<E> {
   return fa._tag === "Left";
}

/**
 * ```haskell
 * isRight :: Either e a -> is Right a
 * ```
 *
 * Returns `true` if the either is an instance of `Right`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isRight<E, A>(fa: Either<E, A>): fa is Right<A> {
   return fa._tag === "Right";
}
