import { pure } from "../_core";
import type { IO } from "../model";
import { repeatUntilM_ } from "./repeatUntilM";

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil_<R, E, A>(ef: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatUntilM_(ef, (a) => pure(f(a)));
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil<A>(f: (a: A) => boolean): <R, E>(ef: IO<R, E, A>) => IO<R, E, A> {
  return (ef) => repeatUntil_(ef, f);
}
