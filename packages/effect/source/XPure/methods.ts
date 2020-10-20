import { identity, tuple } from "@principia/core/Function";

import { succeed } from "./constructors";
import { ChainInstruction, GiveInstruction, ReadInstruction } from "./instructions";
import type { XPure } from "./XPure";

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
