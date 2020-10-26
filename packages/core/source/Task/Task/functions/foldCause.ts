import { flow } from "../../../Function";
import type { Cause } from "../../Exit/Cause/model";
import { foldCauseM_, pure } from "../core";
import type { Task } from "../model";

/**
 * A more powerful version of `fold_` that allows recovering from any kind of failure except interruptions.
 */
export const foldCause_ = <R, E, A, A1, A2>(
   ef: Task<R, E, A>,
   onFailure: (cause: Cause<E>) => A1,
   onSuccess: (a: A) => A2
) => foldCauseM_(ef, flow(onFailure, pure), flow(onSuccess, pure));

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export const foldCause = <E, A, A1, A2>(onFailure: (cause: Cause<E>) => A1, onSuccess: (a: A) => A2) => <R>(
   ef: Task<R, E, A>
) => foldCause_(ef, onFailure, onSuccess);
