import { identity } from "../Function";
import { map_ } from "./functor";
import type { XPure } from "./model";
import { ChainInstruction } from "./model";

/*
 * -------------------------------------------
 * Monad XPure
 * -------------------------------------------
 */

export function chain_<S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> {
   return new ChainInstruction(ma, f);
}

export function chain<A, S2, S3, Q, D, B>(
   f: (a: A) => XPure<S2, S3, Q, D, B>
): <S1, R, E>(ma: XPure<S1, S2, R, E, A>) => XPure<S1, S3, Q & R, D | E, B> {
   return (ma) => chain_(ma, f);
}

export function tap_<S1, S2, R, E, A, S3, Q, D, B>(
   ma: XPure<S1, S2, R, E, A>,
   f: (a: A) => XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, A> {
   return chain_(ma, (a) => map_(f(a), () => a));
}

export function tap<S2, A, S3, Q, D, B>(
   f: (a: A) => XPure<S2, S3, Q, D, B>
): <S1, R, E>(ma: XPure<S1, S2, R, E, A>) => XPure<S1, S3, Q & R, D | E, A> {
   return (ma) => tap_(ma, f);
}

export function flatten<S1, S2, R, E, A, S3, Q, D>(
   mma: XPure<S1, S2, R, E, XPure<S2, S3, Q, D, A>>
): XPure<S1, S3, Q & R, D | E, A> {
   return chain_(mma, identity);
}
