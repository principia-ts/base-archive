import { succeed } from "./constructors";
import type { SIO } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Fold SIO
 * -------------------------------------------
 */

/**
 * ```haskell
 * foldM_ :: (
 *    SIO s1 s2 r e a,
 *    (e -> SIO s3 s4 r1 e1 b),
 *    (a -> SIO s2 s5 r2 e2 c)
 * ) -> SIO (s1 & s3) (s4 | s5) (r & r1 & r2) (b | c)
 * ```
 *
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldM_<S1, S5, S2, R, E, A, S3, R1, E1, B, S4, R2, E2, C>(
  fa: SIO<S1, S2, R, E, A>,
  onFailure: (e: E) => SIO<S5, S3, R1, E1, B>,
  onSuccess: (a: A) => SIO<S2, S4, R2, E2, C>
): SIO<S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new FoldInstruction(fa, onFailure, onSuccess);
}

/**
 * ```haskell
 * foldM :: (
 *    (e -> SIO s3 s4 r1 e1 b),
 *    (a -> SIO s2 s5 r2 e2 c)
 * ) -> SIO s1 s2 r e a -> SIO (s1 & s3) (s4 | s5) (r & r1 & r2) (b | c)
 * ```
 *
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldM<S1, S2, E, A, S3, R1, E1, B, S4, R2, E2, C>(
  onFailure: (e: E) => SIO<S1, S3, R1, E1, B>,
  onSuccess: (a: A) => SIO<S2, S4, R2, E2, C>
): <R>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => foldM_(fa, onFailure, onSuccess);
}

/**
 * ```haskell
 * fold_ :: (
 *    SIO s1 s2 r e a,
 *    (e -> b),
 *    (a -> c)
 * ) -> SIO s1 s2 r _ (b | c)
 * ```
 *
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fold_<S1, S2, R, E, A, B, C>(
  fa: SIO<S1, S2, R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): SIO<S1, S2, R, never, B | C> {
  return foldM_(
    fa,
    (e) => succeed(onFailure(e)),
    (a) => succeed(onSuccess(a))
  );
}

/**
 * ```haskell
 * fold :: ((e -> b), (a -> c)) -> SIO s1 s2 r e a -> SIO s1 s2 r _ (b | c)
 * ```
 *
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fold<E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): <S1, S2, R>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, never, B | C> {
  return (fa) => fold_(fa, onFailure, onSuccess);
}
