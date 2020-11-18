import * as E from "../Either";
import { modify, succeed } from "./constructors";
import { fold_, foldM_ } from "./fold";
import { map_ } from "./functor";
import type { XPure } from "./model";
import { chain_ } from "./monad";

/**
 * ```haskell
 * catchAll_ :: (XPure s1 s2 r e a, (e -> XPure s1 s3 r1 e1 b)) ->
 *    XPure s1 s3 (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<S1, S2, R, E, A, S3, R1, E1, B>(
  fa: XPure<S1, S2, R, E, A>,
  onFailure: (e: E) => XPure<S1, S3, R1, E1, B>
): XPure<S1, S3, R & R1, E1, A | B> {
  return foldM_(fa, onFailure, (a) => succeed(a));
}

/**
 * ```haskell
 * catchAll_ :: (e -> XPure s1 s3 r1 e1 b) -> XPure s1 s2 r e a ->
 *    XPure s1 s3 (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<S1, E, S3, R1, E1, B>(
  onFailure: (e: E) => XPure<S1, S3, R1, E1, B>
): <S2, R, A>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S3, R & R1, E1, B | A> {
  return (fa) => catchAll_(fa, onFailure);
}

/**
 * ```haskell
 * update :: (s1 -> s2) -> XPure s1 s2 _ _ ()
 * ```
 *
 * Constructs a computation from the specified update function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function update<S1, S2>(f: (s: S1) => S2): XPure<S1, S2, unknown, never, void> {
  return modify((s) => [f(s), undefined]);
}

/**
 * ```haskell
 * contramapInput_ :: (XPure s1 s2 r e a, (s0 -> s1)) -> XPure s0 s2 r e a
 * ```
 *
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapInput_<S0, S1, S2, R, E, A>(
  fa: XPure<S1, S2, R, E, A>,
  f: (s: S0) => S1
): XPure<S0, S2, R, E, A> {
  return chain_(update(f), () => fa);
}

/**
 * ```haskell
 * contramapInput :: (s0 -> s1) -> XPure s1 s2 r e a -> XPure s0 s2 r e a
 * ```
 *
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapInput<S0, S1>(
  f: (s: S0) => S1
): <S2, R, E, A>(fa: XPure<S1, S2, R, E, A>) => XPure<S0, S2, R, E, A> {
  return (fa) => contramapInput_(fa, f);
}

/**
 * ```haskell
 * either :: XPure s1 s2 r e a -> XPure s1 (s1 | s2) r _ (Either e a)
 * ```
 *
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function either<S1, S2, R, E, A>(
  fa: XPure<S1, S2, R, E, A>
): XPure<S1, S1 | S2, R, never, E.Either<E, A>> {
  return fold_(fa, E.left, E.right);
}

export function orElse_<S1, S2, R, E, A, S3, S4, R1, E1>(
  fa: XPure<S1, S2, R, E, A>,
  onFailure: (e: E) => XPure<S3, S4, R1, E1, A>
): XPure<S1 & S3, S2 | S4, R & R1, E1, A> {
  return foldM_(fa, onFailure, succeed);
}

export function orElse<E, A, S3, S4, R1, E1>(
  onFailure: (e: E) => XPure<S3, S4, R1, E1, A>
): <S1, S2, R>(fa: XPure<S1, S2, R, E, A>) => XPure<S1 & S3, S4 | S2, R & R1, E1, A> {
  return (fa) => orElse_(fa, onFailure);
}

/**
 * ```haskell
 * orElseEither_ :: (XPure s1 s2 r e a, XPure s3 s4 r1 e1 a1) ->
 *    XPure (s1 & s3) (s2 | s4) (r & r1) e1 (Either a a1)
 * ```
 *
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither_<S1, S2, R, E, A, S3, S4, R1, E1, A1>(
  fa: XPure<S1, S2, R, E, A>,
  that: XPure<S3, S4, R1, E1, A1>
): XPure<S1 & S3, S2 | S4, R & R1, E1, E.Either<A, A1>> {
  return foldM_(
    fa,
    () => map_(that, E.right),
    (a) => succeed(E.left(a))
  );
}

/**
 * ```haskell
 * orElseEither :: XPure s3 s4 r1 e1 a1 -> XPure s1 s2 r e a ->
 *    XPure (s1 & s3) (s2 | s4) (r & r1) e1 (Either a a1)
 * ```
 *
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither<S3, S4, R1, E1, A1>(
  that: XPure<S3, S4, R1, E1, A1>
): <S1, S2, R, E, A>(
  fa: XPure<S1, S2, R, E, A>
) => XPure<S1 & S3, S4 | S2, R & R1, E1, E.Either<A, A1>> {
  return (fa) => orElseEither_(fa, that);
}
