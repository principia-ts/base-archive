import type { Predicate, Refinement } from "../../Function";
import { flow } from "../../Function";
import { die } from "../_core";
import type { IO } from "../model";
import { filterOrElse_ } from "./filterOrElse";

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  dieWith: (a: A) => unknown
): IO<R, E, A>;
export function filterOrDie_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  dieWith: (a: A) => unknown
): IO<R, E, A>;
export function filterOrDie_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  dieWith: (a: A) => unknown
): IO<R, E, A> {
  return filterOrElse_(fa, predicate, flow(dieWith, die));
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie<A, B extends A>(
  refinement: Refinement<A, B>
): (dieWith: (a: A) => unknown) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDie<A>(
  predicate: Predicate<A>
): (dieWith: (a: A) => unknown) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDie<A>(
  predicate: Predicate<A>
): (dieWith: (a: A) => unknown) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (dieWith) => (fa) => filterOrDie_(fa, predicate, dieWith);
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  message: (a: A) => string
): IO<R, E, A>;
export function filterOrDieMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
): IO<R, E, A>;
export function filterOrDieMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
) {
  return filterOrDie_(fa, predicate, (a) => new Error(message(a)));
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export function filterOrDieMessage<A, B extends A>(
  refinement: Refinement<A, B>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDieMessage<A>(
  predicate: Predicate<A>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>;
export function filterOrDieMessage<A>(
  predicate: Predicate<A>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (message) => (fa) => filterOrDieMessage_(fa, predicate, message);
}
