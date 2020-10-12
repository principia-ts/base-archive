import * as E from "@principia/core/Either";
import type * as P from "@principia/prelude";

import { modify, succeed } from "./constructors";
import { FoldInstruction } from "./instructions";
import { asksM, chain_, map_ } from "./methods";
import type { URI, V, XPure } from "./XPure";

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
): XPure<S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> => FoldInstruction(fa, onFailure, onSuccess);

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
export const catchAll_ = <S1, S2, R, E, A, S3, R1, E1, B>(
   fa: XPure<S1, S2, R, E, A>,
   onFailure: (e: E) => XPure<S1, S3, R1, E1, B>
) => foldM_(fa, onFailure, (a) => succeed(a));

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
export const catchAll = <S1, E, S3, R1, E1, B>(onFailure: (e: E) => XPure<S1, S3, R1, E1, B>) => <S2, R, A>(
   fa: XPure<S1, S2, R, E, A>
) => catchAll_(fa, onFailure);

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
export const update = <S1, S2>(f: (s: S1) => S2): XPure<S1, S2, unknown, never, void> =>
   modify((s) => [f(s), undefined]);

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
export const contramapInput_ = <S0, S1, S2, R, E, A>(fa: XPure<S1, S2, R, E, A>, f: (s: S0) => S1) =>
   chain_(update(f), () => fa);

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
export const contramapInput = <S0, S1>(f: (s: S0) => S1) => <S2, R, E, A>(fa: XPure<S1, S2, R, E, A>) =>
   contramapInput_(fa, f);

/**
 * ```haskell
 * environment :: <r, s1, s2>() -> XPure s1 s2 r _ r
 * ```
 *
 * Access the environment
 *
 * @category Combinators
 * @since 1.0.0
 */
export const environment = <R, S1 = unknown, S2 = never>() => asksM((r: R) => succeed<R, S1, S2>(r));

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
export const either = <S1, S2, R, E, A>(fa: XPure<S1, S2, R, E, A>): XPure<S1, S1 | S2, R, never, E.Either<E, A>> =>
   fold_(fa, E.left, E.right);

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
export const orElseEither_ = <S1, S2, R, E, A, S3, S4, R1, E1, A1>(
   fa: XPure<S1, S2, R, E, A>,
   that: XPure<S3, S4, R1, E1, A1>
): XPure<S1 & S3, S2 | S4, R & R1, E1, E.Either<A, A1>> =>
   foldM_(
      fa,
      () => map_(that, E.right),
      (a) => succeed(E.left(a))
   );

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
export const orElseEither = <S3, S4, R1, E1, A1>(that: XPure<S3, S4, R1, E1, A1>) => <S1, S2, R, E, A>(
   fa: XPure<S1, S2, R, E, A>
) => orElseEither_(fa, that);

export const bimap_: P.BimapFn_<[URI], V> = (pab, f, g) =>
   foldM_(
      pab,
      (e) => fail(f(e)),
      (a) => succeed(g(a))
   );

export const bimap: P.BimapFn<[URI], V> = (f, g) => (pab) => bimap_(pab, f, g);

export const first_: P.FirstFn_<[URI], V> = (pab, f) => catchAll_(pab, (e) => fail(f(e)));

export const first: P.FirstFn<[URI], V> = (f) => (pab) => first_(pab, f);

export const mapError = first;
