import type { Predicate, Refinement } from "../../Function";
import { flow } from "../../Function";
import { fail } from "../_core";
import type { IO } from "../model";
import { filterOrElse_ } from "./filterOrElse";

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, A, B extends A, E1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  failWith: (a: A) => E1
): IO<R, E | E1, B>;
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A>;
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A> {
  return filterOrElse_(fa, predicate, flow(failWith, fail));
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail<A, B extends A>(
  refinement: Refinement<A, B>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, B>;
export function filterOrFail<A>(
  predicate: Predicate<A>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A>;
export function filterOrFail<A>(
  predicate: Predicate<A>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A> {
  return (failWith) => (fa) => filterOrFail_(fa, predicate, failWith);
}
