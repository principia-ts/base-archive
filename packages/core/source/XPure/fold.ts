import { succeed } from "./constructors";
import type { XPure } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Fold XPure
 * -------------------------------------------
 */

/**
 * ```haskell
 * foldM_ :: (
 *    XPure s1 s2 r e a,
 *    (e -> XPure s3 s4 r1 e1 b),
 *    (a -> XPure s2 s5 r2 e2 c)
 * ) -> XPure (s1 & s3) (s4 | s5) (r & r1 & r2) (b | c)
 * ```
 *
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foldM_ = <S1, S5, S2, R, E, A, S3, R1, E1, B, S4, R2, E2, C>(
   fa: XPure<S1, S2, R, E, A>,
   onFailure: (e: E) => XPure<S5, S3, R1, E1, B>,
   onSuccess: (a: A) => XPure<S2, S4, R2, E2, C>
): XPure<S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> => new FoldInstruction(fa, onFailure, onSuccess);

/**
 * ```haskell
 * foldM :: (
 *    (e -> XPure s3 s4 r1 e1 b),
 *    (a -> XPure s2 s5 r2 e2 c)
 * ) -> XPure s1 s2 r e a -> XPure (s1 & s3) (s4 | s5) (r & r1 & r2) (b | c)
 * ```
 *
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foldM = <S1, S2, E, A, S3, R1, E1, B, S4, R2, E2, C>(
   onFailure: (e: E) => XPure<S1, S3, R1, E1, B>,
   onSuccess: (a: A) => XPure<S2, S4, R2, E2, C>
) => <R>(fa: XPure<S1, S2, R, E, A>) => foldM_(fa, onFailure, onSuccess);

/**
 * ```haskell
 * fold_ :: (
 *    XPure s1 s2 r e a,
 *    (e -> b),
 *    (a -> c)
 * ) -> XPure s1 s2 r _ (b | c)
 * ```
 *
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fold_ = <S1, S2, R, E, A, B, C>(
   fa: XPure<S1, S2, R, E, A>,
   onFailure: (e: E) => B,
   onSuccess: (a: A) => C
): XPure<S1, S2, R, never, B | C> =>
   foldM_(
      fa,
      (e) => succeed(onFailure(e)),
      (a) => succeed(onSuccess(a))
   );

/**
 * ```haskell
 * fold :: ((e -> b), (a -> c)) -> XPure s1 s2 r e a -> XPure s1 s2 r _ (b | c)
 * ```
 *
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fold = <E, A, B, C>(onFailure: (e: E) => B, onSuccess: (a: A) => C) => <S1, S2, R>(
   fa: XPure<S1, S2, R, E, A>
) => fold_(fa, onFailure, onSuccess);
