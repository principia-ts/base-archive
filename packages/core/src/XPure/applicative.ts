import { tuple } from "../Function";
import { zipWith_ } from "./apply";
import { succeed } from "./constructors";
import type { XPure } from "./model";

/*
 * -------------------------------------------
 * Applicative XPure
 * -------------------------------------------
 */

export function pure<A>(a: A): XPure<unknown, never, unknown, never, A> {
  return succeed(a);
}

export function zip_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: XPure<S1, S2, R, E, A>,
  fb: XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

export function zip<S2, S3, Q, D, B>(
  fb: XPure<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S3, Q & R, D | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}
