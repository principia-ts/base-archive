import { chain_, pure } from "../_core";
import type { IO } from "../model";

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<R, E, A, R1, E1>(
  ef: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return chain_(ef, (a) => chain_(f(a), (b) => (b ? pure(a) : repeatUntilM_(ef, f))));
}

/**
 * Repeats this effect until its result satisfies the specified effectful predicate.
 */
export function repeatUntilM<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ef) => repeatUntilM_(ef, f);
}
