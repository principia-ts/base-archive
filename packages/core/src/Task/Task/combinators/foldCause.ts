import { foldCauseM_, pure } from "../_core";
import { flow } from "../../../Function";
import type { Cause } from "../../Exit/Cause/model";
import type { Task } from "../model";

/**
 * A more powerful version of `fold_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, A1, A2>(
  ef: Task<R, E, A>,
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): Task<R, never, A1 | A2> {
  return foldCauseM_(ef, flow(onFailure, pure), flow(onSuccess, pure));
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause<E, A, A1, A2>(
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): <R>(ef: Task<R, E, A>) => Task<R, never, A1 | A2> {
  return (ef) => foldCause_(ef, onFailure, onSuccess);
}
