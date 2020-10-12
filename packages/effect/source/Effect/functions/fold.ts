import { flow } from "@principia/core/Function";

import { foldM_, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export const fold_ = <R, E, A, B, C>(
   fa: Effect<R, E, A>,
   onFailure: (reason: E) => B,
   onSuccess: (a: A) => C
): Effect<R, never, B | C> => foldM_(fa, flow(onFailure, pure), flow(onSuccess, pure));

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export const fold = <E, A, B, C>(onFailure: (reason: E) => B, onSuccess: (a: A) => C) => <R>(ef: Effect<R, E, A>) =>
   fold_(ef, onFailure, onSuccess);
