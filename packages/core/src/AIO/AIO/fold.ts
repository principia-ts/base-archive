import * as E from "../../Either";
import { flow } from "../../Function";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import { halt, succeed } from "./constructors";
import type { AIO } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Fold AIO
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: AIO<R, E, A>,
  onFailure: (cause: Cause<E>) => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): AIO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new FoldInstruction(ma, onFailure, onSuccess);
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): <R>(ma: AIO<R, E, A>) => AIO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => new FoldInstruction(ma, onFailure, onSuccess);
}

export function foldM_<R, R1, R2, E, E1, E2, A, A1, A2>(
  ma: AIO<R, E, A>,
  onFailure: (e: E) => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): AIO<R & R1 & R2, E1 | E2, A1 | A2> {
  return foldCauseM_(ma, (cause) => E.fold_(C.failureOrCause(cause), onFailure, halt), onSuccess);
}

export function foldM<R1, R2, E, E1, E2, A, A1, A2>(
  onFailure: (e: E) => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): <R>(ma: AIO<R, E, A>) => AIO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldM_(ma, onFailure, onSuccess);
}

/**
 * Folds over the failure value or the success value to yield an AIO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  fa: AIO<R, E, A>,
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): AIO<R, never, B | C> {
  return foldM_(fa, flow(onFailure, succeed), flow(onSuccess, succeed));
}

/**
 * Folds over the failure value or the success value to yield an AIO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold<E, A, B, C>(
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): <R>(ef: AIO<R, E, A>) => AIO<R, never, B | C> {
  return (ef) => fold_(ef, onFailure, onSuccess);
}
