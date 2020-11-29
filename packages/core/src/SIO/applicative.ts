import { tuple } from "../Function";
import { zipWith_ } from "./apply";
import { succeed } from "./constructors";
import type { SIO } from "./model";

/*
 * -------------------------------------------
 * Applicative SIO
 * -------------------------------------------
 */

export function pure<A>(a: A): SIO<unknown, never, unknown, never, A> {
  return succeed(a);
}

export function zip_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

export function zip<S2, S3, Q, D, B>(
  fb: SIO<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}
