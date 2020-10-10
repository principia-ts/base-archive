import { identity, tuple } from "@principia/core/Function";
import type * as P from "@principia/prelude";

import { succeed } from "./constructors";
import { AccessInstruction, ChainInstruction, ProvideInstruction } from "./instructions";
import type { URI, V, XPure } from "./XPure";

export const chain_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> => new ChainInstruction(ma, f);

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

export const ask = <R>(): XPure<unknown, never, R, never, R> => new AccessInstruction((r: R) => succeed(r));

export const asksM: P.AsksMFn<[URI], V> = (f) => new AccessInstruction(f);

export const asks: P.AsksFn<[URI], V> = (f) => asksM((r: Parameters<typeof f>[0]) => succeed(f(r)));

export const giveAll_: P.GiveAllFn_<[URI], V> = (fa, r) => new ProvideInstruction(fa, r);

export const giveAll: P.GiveAllFn<[URI], V> = (r) => (fa) => giveAll_(fa, r);

export const local_: P.LocalFn_<[URI], V> = (ma, f) => asksM((r: Parameters<typeof f>[0]) => giveAll_(ma, f(r)));

export const local: P.LocalFn<[URI], V> = (f) => (ma) => local_(ma, f);

export const give_: P.GiveFn_<[URI], V> = (ma, r) => local_(ma, (r0) => ({ ...r, ...r0 }));

export const give: P.GiveFn<[URI], V> = (r) => (ma) => give_(ma, r);
