import type { Predicate, Refinement } from "@principia/core/Function";
import { flow } from "@principia/core/Function";

import { chain_, die, fail, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * Applies `or` if the predicate fails.
 */
export const filterOrElse_: {
   <R, E, A, B extends A, R1, E1, A1>(
      fa: Effect<R, E, A>,
      refinement: Refinement<A, B>,
      or: (a: A) => Effect<R1, E1, A1>
   ): Effect<R & R1, E | E1, B | A1>;
   <R, E, A, R1, E1, A1>(fa: Effect<R, E, A>, predicate: Predicate<A>, or: (a: A) => Effect<R1, E1, A1>): Effect<
      R & R1,
      E | E1,
      A | A1
   >;
} = <R, E, A, R1, E1, A1>(
   fa: Effect<R, E, A>,
   predicate: Predicate<A>,
   or: (a: A) => Effect<R1, E1, A1>
): Effect<R & R1, E | E1, A | A1> => chain_(fa, (a): Effect<R1, E1, A | A1> => (predicate(a) ? pure(a) : or(a)));

/**
 * Applies `or` if the predicate fails.
 */
export const filterOrElse: {
   <A, B extends A>(refinement: Refinement<A, B>): <R1, E1, A1>(
      or: (a: A) => Effect<R1, E1, A1>
   ) => <R, E>(fa: Effect<R, E, A>) => Effect<R & R1, E | E1, A | A1>;
   <A>(predicate: Predicate<A>): <R1, E1, A1>(
      or: (a: A) => Effect<R1, E1, A1>
   ) => <R, E>(fa: Effect<R, E, A>) => Effect<R & R1, E | E1, A | A1>;
} = <A>(predicate: Predicate<A>) => <R1, E1, A1>(or: (a: A) => Effect<R1, E1, A1>) => <R, E>(fa: Effect<R, E, A>) =>
   filterOrElse_(fa, predicate, or);

/**
 * Fails with `failWith` if the predicate fails.
 */
export const filterOrFail_: {
   <R, E, A, B extends A, E1>(fa: Effect<R, E, A>, refinement: Refinement<A, B>, failWith: (a: A) => E1): Effect<
      R,
      E | E1,
      B
   >;
   <R, E, A, E1>(fa: Effect<R, E, A>, predicate: Predicate<A>, failWith: (a: A) => E1): Effect<R, E | E1, A>;
} = <R, E, A, E1>(fa: Effect<R, E, A>, predicate: Predicate<A>, failWith: (a: A) => E1): Effect<R, E | E1, A> =>
   filterOrElse_(fa, predicate, flow(failWith, fail));

/**
 * Fails with `failWith` if the predicate fails.
 */
export const filterOrFail: {
   <A, B extends A>(refinement: Refinement<A, B>): <E1>(
      failWith: (a: A) => E1
   ) => <R, E>(fa: Effect<R, E, A>) => Effect<R, E | E1, B>;
   <A>(predicate: Predicate<A>): <E1>(failWith: (a: A) => E1) => <R, E>(fa: Effect<R, E, A>) => Effect<R, E | E1, A>;
} = <A>(predicate: Predicate<A>) => <E1>(failWith: (a: A) => E1) => <R, E>(fa: Effect<R, E, A>): Effect<R, E | E1, A> =>
   filterOrFail_(fa, predicate, failWith);

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export const filterOrDie_: {
   <R, E, A, B extends A>(fa: Effect<R, E, A>, refinement: Refinement<A, B>, dieWith: (a: A) => unknown): Effect<
      R,
      E,
      A
   >;
   <R, E, A>(fa: Effect<R, E, A>, predicate: Predicate<A>, dieWith: (a: A) => unknown): Effect<R, E, A>;
} = <R, E, A>(fa: Effect<R, E, A>, predicate: Predicate<A>, dieWith: (a: A) => unknown) =>
   filterOrElse_(fa, predicate, flow(dieWith, die));

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export const filterOrDie: {
   <A, B extends A>(refinement: Refinement<A, B>): (
      dieWith: (a: A) => unknown
   ) => <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>;
   <A>(predicate: Predicate<A>): (dieWith: (a: A) => unknown) => <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>;
} = <A>(predicate: Predicate<A>) => (dieWith: (a: A) => unknown) => <R, E>(fa: Effect<R, E, A>) =>
   filterOrDie_(fa, predicate, dieWith);

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export const filterOrDieMessage_: {
   <R, E, A, B extends A>(fa: Effect<R, E, A>, refinement: Refinement<A, B>, message: (a: A) => string): Effect<
      R,
      E,
      A
   >;
   <R, E, A>(fa: Effect<R, E, A>, predicate: Predicate<A>, message: (a: A) => string): Effect<R, E, A>;
} = <R, E, A>(fa: Effect<R, E, A>, predicate: Predicate<A>, message: (a: A) => string) =>
   filterOrDie_(fa, predicate, (a) => new Error(message(a)));

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export const filterOrDieMessage: {
   <A, B extends A>(refinement: Refinement<A, B>): (
      message: (a: A) => string
   ) => <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>;
   <A>(predicate: Predicate<A>): (message: (a: A) => string) => <R, E>(fa: Effect<R, E, A>) => Effect<R, E, A>;
} = <A>(predicate: Predicate<A>) => (message: (a: A) => string) => <R, E>(fa: Effect<R, E, A>) =>
   filterOrDieMessage_(fa, predicate, message);
