import type { Predicate, Refinement } from "../../Function";
import { chain_, succeed } from "../_core";
import type { IO } from "../model";

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R1, E1, A1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, B | A1>;
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1>;
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return chain_(fa, (a): IO<R1, E1, A | A1> => (predicate(a) ? succeed(a) : or(a)));
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse<A, B extends A>(
  refinement: Refinement<A, B>
): <R1, E1, A1>(
  or: (a: A) => IO<R1, E1, A1>
) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>;
export function filterOrElse<A>(
  predicate: Predicate<A>
): <R1, E1, A1>(
  or: (a: A) => IO<R1, E1, A1>
) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>;
export function filterOrElse<A>(
  predicate: Predicate<A>
): <R1, E1, A1>(
  or: (a: A) => IO<R1, E1, A1>
) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (or) => (fa) => filterOrElse_(fa, predicate, or);
}
