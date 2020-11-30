import * as E from "../Either";
import { flow } from "../Function";
import type { Cause } from "./Cause";
import * as C from "./Cause";
import { halt, succeed } from "./constructors";
import type { IO } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Fold IO
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new FoldInstruction(ma, onFailure, onSuccess);
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => new FoldInstruction(ma, onFailure, onSuccess);
}

export function foldM_<R, R1, R2, E, E1, E2, A, A1, A2>(
  ma: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return foldCauseM_(ma, (cause) => E.fold_(C.failureOrCause(cause), onFailure, halt), onSuccess);
}

export function foldM<R1, R2, E, E1, E2, A, A1, A2>(
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldM_(ma, onFailure, onSuccess);
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  fa: IO<R, E, A>,
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): IO<R, never, B | C> {
  return foldM_(fa, flow(onFailure, succeed), flow(onSuccess, succeed));
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold<E, A, B, C>(
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): <R>(ef: IO<R, E, A>) => IO<R, never, B | C> {
  return (ef) => fold_(ef, onFailure, onSuccess);
}
