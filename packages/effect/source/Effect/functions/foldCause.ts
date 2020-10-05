import { flow } from "@principia/core/Function";

import type { Cause } from "../../Cause/Cause";
import { _foldCauseM, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * A more powerful version of `_fold` that allows recovering from any kind of failure except interruptions.
 */
export const _foldCause = <R, E, A, A1, A2>(
   ef: Effect<R, E, A>,
   onFailure: (cause: Cause<E>) => A1,
   onSuccess: (a: A) => A2
) => _foldCauseM(ef, flow(onFailure, pure), flow(onSuccess, pure));

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export const foldCause = <E, A, A1, A2>(
   onFailure: (cause: Cause<E>) => A1,
   onSuccess: (a: A) => A2
) => <R>(ef: Effect<R, E, A>) => _foldCause(ef, onFailure, onSuccess);
