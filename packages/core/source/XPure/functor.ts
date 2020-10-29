import { ChainInstruction } from "./_concrete";
import { succeed } from "./constructors";
import type { XPure } from "./model";

/**
 * @internal
 */
const chain_ = <S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> => new ChainInstruction(ma, f);

/*
 * -------------------------------------------
 * Functor XPure
 * -------------------------------------------
 */

export const map_ = <S1, S2, R, E, A, B>(fa: XPure<S1, S2, R, E, A>, f: (a: A) => B): XPure<S1, S2, R, E, B> =>
   chain_(fa, (a) => succeed(f(a)));

export const map = <A, B>(f: (a: A) => B) => <S1, S2, R, E>(fa: XPure<S1, S2, R, E, A>): XPure<S1, S2, R, E, B> =>
   map_(fa, f);
