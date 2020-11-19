import { flow, pipe } from "../Function";
import * as X from "../XPure";
import { both_ } from "./applicative";
import { succeed } from "./constructors";
import { recover } from "./fallible";
import type { Sync } from "./model";
import { chain } from "./monad";

/*
 * -------------------------------------------
 * Sync Combinators
 * -------------------------------------------
 */

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foldM_: <R, E, A, R1, E1, B, R2, E2, C>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => Sync<R1, E1, B>,
  onSuccess: (a: A) => Sync<R2, E2, C>
) => Sync<R & R1 & R2, E1 | E2, B | C> = X.foldM_;

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foldM: <E, A, R1, E1, B, R2, E2, C>(
  onFailure: (e: E) => Sync<R1, E1, B>,
  onSuccess: (a: A) => Sync<R2, E2, C>
) => <R>(fa: Sync<R, E, A>) => Sync<R & R1 & R2, E1 | E2, B | C> = X.foldM;

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fold_: <R, E, A, B, C>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
) => Sync<R, never, B | C> = X.fold_;

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fold: <E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
) => <R>(fa: Sync<R, E, A>) => Sync<R, never, B | C> = X.fold;

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAll_: <R, E, A, Q, D, B>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => Sync<Q, D, B>
) => Sync<Q & R, D, A | B> = X.catchAll_;

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAll: <E, Q, D, B>(
  onFailure: (e: E) => Sync<Q, D, B>
) => <R, A>(fa: Sync<R, E, A>) => Sync<Q & R, D, A | B> = X.catchAll;

/**
 * Effectfully folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldTogetherM_<R, E, A, R1, E1, B, R2, E2, C, R3, E3, D, R4, E4, F, R5, E5, G>(
  left: Sync<R, E, A>,
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => Sync<R2, E2, C>,
  onRightFailure: (a: A, e1: E1) => Sync<R3, E3, D>,
  onLeftFailure: (b: B, e: E) => Sync<R4, E4, F>,
  onBothSuccess: (a: A, b: B) => Sync<R5, E5, G>
): Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> {
  return pipe(
    both_(recover(left), recover(right)),
    chain(
      ([ea, eb]): Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> => {
        switch (ea._tag) {
          case "Left": {
            switch (eb._tag) {
              case "Left": {
                return onBothFailure(ea.left, eb.left);
              }
              case "Right": {
                return onLeftFailure(eb.right, ea.left);
              }
            }
          }
          // eslint-disable-next-line no-fallthrough
          case "Right": {
            switch (eb._tag) {
              case "Left": {
                return onRightFailure(ea.right, eb.left);
              }
              case "Right": {
                return onBothSuccess(ea.right, eb.right);
              }
            }
          }
        }
      }
    )
  );
}

/**
 * Effectfully folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldTogetherM<E, A, R1, E1, B, R2, E2, C, R3, E3, D, R4, E4, F, R5, E5, G>(
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => Sync<R2, E2, C>,
  onRightFailure: (a: A, e1: E1) => Sync<R3, E3, D>,
  onLeftFailure: (b: B, e: E) => Sync<R4, E4, F>,
  onBothSuccess: (a: A, b: B) => Sync<R5, E5, G>
): <R>(left: Sync<R, E, A>) => Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> {
  return (left) =>
    foldTogetherM_(left, right, onBothFailure, onRightFailure, onLeftFailure, onBothSuccess);
}

/**
 * Folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldTogether_<R, E, A, R1, E1, B, C, D, F, G>(
  left: Sync<R, E, A>,
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => C,
  onRightFailure: (a: A, e1: E1) => D,
  onLeftFailure: (b: B, e: E) => F,
  onBothSuccess: (a: A, b: B) => G
): Sync<R & R1, never, C | D | F | G> {
  return foldTogetherM_(
    left,
    right,
    flow(onBothFailure, succeed),
    flow(onRightFailure, succeed),
    flow(onLeftFailure, succeed),
    flow(onBothSuccess, succeed)
  );
}

/**
 * Folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldTogether<E, A, R1, E1, B, C, D, F, G>(
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => C,
  onRightFailure: (a: A, e1: E1) => D,
  onLeftFailure: (b: B, e: E) => F,
  onBothSuccess: (a: A, b: B) => G
): <R>(left: Sync<R, E, A>) => Sync<R & R1, never, C | D | F | G> {
  return (left) =>
    foldTogether_(left, right, onBothFailure, onRightFailure, onLeftFailure, onBothSuccess);
}
