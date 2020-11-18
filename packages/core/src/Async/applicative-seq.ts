import { tuple } from "../Function";
import { mapBoth_ } from "./apply-seq";
import { succeed } from "./constructors";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Sequential Applicative Async
 * -------------------------------------------
 */

export function both_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> {
  return mapBoth_(fa, fb, tuple);
}

export function both<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, readonly [A, A1]> {
  return (fa) => both_(fa, fb);
}

export function pure<A>(a: A): Async<unknown, never, A> {
  return succeed(a);
}
