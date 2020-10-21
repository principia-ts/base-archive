import { ENGINE_METHOD_PKEY_ASN1_METHS, SIGUSR1 } from "constants";

import * as E from "../Either";
import { identity, tuple } from "../Function";
import { fail, succeed } from "./constructors";
import { ChainInstruction, FoldInstruction, GiveInstruction, ReadInstruction } from "./instructions";
import type { XPure } from "./XPure";

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

export const chain_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> => ChainInstruction(ma, f);

export const chain = <A, S2, S3, Q, D, B>(f: (a: A) => XPure<S2, S3, Q, D, B>) => <S1, R, E>(
   ma: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, B> => chain_(ma, f);

export const map_ = <S1, S2, R, E, A, B>(fa: XPure<S1, S2, R, E, A>, f: (a: A) => B): XPure<S1, S2, R, E, B> =>
   chain_(fa, (a) => succeed(f(a)));

export const map = <A, B>(f: (a: A) => B) => <S1, S2, R, E>(fa: XPure<S1, S2, R, E, A>): XPure<S1, S2, R, E, B> =>
   map_(fa, f);

export const tap_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, A> => chain_(ma, (a) => map_(f(a), () => a));

export const tap = <S2, A, S3, Q, D, B>(f: (a: A) => XPure<S2, S3, Q, D, B>) => <S1, R, E>(
   ma: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, A> => tap_(ma, f);

export const pure = <A>(a: A): XPure<unknown, never, unknown, never, A> => succeed(a);

export const bimap_ = <S1, S2, R, E, A, G, B>(
   pab: XPure<S1, S2, R, E, A>,
   f: (e: E) => G,
   g: (a: A) => B
): XPure<S1, S2, R, G, B> =>
   foldM_(
      pab,
      (e) => fail(f(e)),
      (a) => succeed(g(a))
   );

export const bimap = <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => <S1, S2, R>(
   pab: XPure<S1, S2, R, E, A>
): XPure<S1, S2, R, G, B> => bimap_(pab, f, g);

export const first_ = <S1, S2, R, E, A, G>(pab: XPure<S1, S2, R, E, A>, f: (e: E) => G): XPure<S1, S2, R, G, A> =>
   foldM_(pab, (e) => fail(f(e)), succeed);

export const first = <E, G>(f: (e: E) => G) => <S1, S2, R, A>(pab: XPure<S1, S2, R, E, A>): XPure<S1, S2, R, G, A> =>
   first_(pab, f);

export const mapBoth_ = <S1, S2, R, E, A, S3, Q, D, B, C>(
   fa: XPure<S1, S2, R, E, A>,
   fb: XPure<S2, S3, Q, D, B>,
   f: (a: A, b: B) => C
): XPure<S1, S3, Q & R, D | E, C> => chain_(fa, (a) => map_(fb, (b) => f(a, b)));

export const mapBoth = <A, S2, S3, Q, D, B, C>(fb: XPure<S2, S3, Q, D, B>, f: (a: A, b: B) => C) => <S1, R, E>(
   fa: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, C> => mapBoth_(fa, fb, f);

export const both_ = <S1, S2, R, E, A, S3, Q, D, B>(
   fa: XPure<S1, S2, R, E, A>,
   fb: XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, readonly [A, B]> => mapBoth_(fa, fb, tuple);

export const both = <S2, S3, Q, D, B>(fb: XPure<S2, S3, Q, D, B>) => <S1, R, E, A>(
   fa: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, readonly [A, B]> => both_(fa, fb);

export const flatten = <S1, S2, R, E, A, S3, Q, D>(
   mma: XPure<S1, S2, R, E, XPure<S2, S3, Q, D, A>>
): XPure<S1, S3, Q & R, D | E, A> => chain_(mma, identity);

export const recover = <S1, S2, R, E, A>(fa: XPure<S1, S2, R, E, A>): XPure<S1, S2, R, never, E.Either<E, A>> =>
   foldM_(
      fa,
      (e) => succeed(E.left(e)),
      (a) => succeed(E.right(a))
   );

export const absolve = <S1, S2, R, E, E1, A>(fa: XPure<S1, S2, R, E, E.Either<E1, A>>): XPure<S1, S2, R, E | E1, A> =>
   chain_(fa, E.fold(fail, succeed));

export const ask = <R>(): XPure<unknown, never, R, never, R> => ReadInstruction((r: R) => succeed(r));

export const asksM: <R0, S1, S2, R, E, A>(
   f: (r: R0) => XPure<S1, S2, R, E, A>
) => XPure<S1, S2, R & R0, E, A> = ReadInstruction;

export const asks = <R0, A>(f: (r: R0) => A) => asksM((r: R0) => succeed(f(r)));

export const giveAll_: <S1, S2, R, E, A>(
   fa: XPure<S1, S2, R, E, A>,
   r: R
) => XPure<S1, S2, unknown, E, A> = GiveInstruction;

export const giveAll = <R>(r: R) => <S1, S2, E, A>(fa: XPure<S1, S2, R, E, A>) => giveAll_(fa, r);

export const local_ = <R0, S1, S2, R, E, A>(ma: XPure<S1, S2, R, E, A>, f: (r0: R0) => R) =>
   asksM((r: R0) => giveAll_(ma, f(r)));

export const local = <R0, R>(f: (r0: R0) => R) => <S1, S2, E, A>(ma: XPure<S1, S2, R, E, A>) => local_(ma, f);

export const give_ = <S1, S2, R, E, A, R0>(ma: XPure<S1, S2, R & R0, E, A>, r: R): XPure<S1, S2, R0, E, A> =>
   local_(ma, (r0) => ({ ...r, ...r0 }));

export const give = <R>(r: R) => <S1, S2, R0, E, A>(ma: XPure<S1, S2, R & R0, E, A>): XPure<S1, S2, R0, E, A> =>
   give_(ma, r);
