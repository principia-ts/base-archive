import { foldM_, pure } from "../_core";
import { flow } from "../../../Function";
import type { Task } from "../model";

/**
 * Folds over the failure value or the success value to yield a task that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export const fold_ = <R, E, A, B, C>(
   fa: Task<R, E, A>,
   onFailure: (reason: E) => B,
   onSuccess: (a: A) => C
): Task<R, never, B | C> => foldM_(fa, flow(onFailure, pure), flow(onSuccess, pure));

/**
 * Folds over the failure value or the success value to yield a task that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export const fold = <E, A, B, C>(onFailure: (reason: E) => B, onSuccess: (a: A) => C) => <R>(ef: Task<R, E, A>) =>
   fold_(ef, onFailure, onSuccess);
