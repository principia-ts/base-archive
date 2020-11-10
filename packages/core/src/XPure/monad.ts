import { identity } from "../Function";
import { ChainInstruction } from "./model";
import { map_ } from "./functor";
import type { XPure } from "./model";

/*
 * -------------------------------------------
 * Monad XPure
 * -------------------------------------------
 */

export const chain_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> => new ChainInstruction(ma, f);

export const chain = <A, S2, S3, Q, D, B>(f: (a: A) => XPure<S2, S3, Q, D, B>) => <S1, R, E>(
   ma: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, B> => chain_(ma, f);

export const tap_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, A> => chain_(ma, (a) => map_(f(a), () => a));

export const tap = <S2, A, S3, Q, D, B>(f: (a: A) => XPure<S2, S3, Q, D, B>) => <S1, R, E>(
   ma: XPure<S1, S2, R, E, A>
): XPure<S1, S3, Q & R, D | E, A> => tap_(ma, f);

export const flatten = <S1, S2, R, E, A, S3, Q, D>(
   mma: XPure<S1, S2, R, E, XPure<S2, S3, Q, D, A>>
): XPure<S1, S3, Q & R, D | E, A> => chain_(mma, identity);
