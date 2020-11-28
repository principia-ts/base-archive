import { tuple } from "../Function";
import { zipWith_ } from "./apply-seq";
import { succeed } from "./constructors";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Sequential Applicative Async
 * -------------------------------------------
 */

export function zip_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> {
  return zipWith_(fa, fb, tuple);
}

export function zip<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, readonly [A, A1]> {
  return (fa) => zip_(fa, fb);
}

export function pure<A>(a: A): Async<unknown, never, A> {
  return succeed(a);
}
