import * as E from "../../Either";
import { flow, pipe } from "../../Function";
import type { Cause } from "../Exit/Cause";
import { failureOrCause } from "../Exit/Cause";
import * as T from "./_internal/task";
import { halt } from "./constructors";
import { Managed } from "./model";

/*
 * -------------------------------------------
 * Fold Managed
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Managed<R, E, A>,
   onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
   onSuccess: (a: A) => Managed<R2, E2, A2>
) =>
   new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
      pipe(
         ma.task,
         T.foldCauseM(
            (c) => onFailure(c).task,
            ([_, a]) => onSuccess(a).task
         )
      )
   );

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
   onSuccess: (a: A) => Managed<R2, E2, A2>
) => <R>(ma: Managed<R, E, A>) => foldCauseM_(ma, onFailure, onSuccess);

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export const foldM_ = <R, E, A, R1, E1, B, R2, E2, C>(
   ma: Managed<R, E, A>,
   f: (e: E) => Managed<R1, E1, B>,
   g: (a: A) => Managed<R2, E2, C>
): Managed<R & R1 & R2, E1 | E2, B | C> => foldCauseM_(ma, flow(failureOrCause, E.fold(f, halt)), g);

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export const foldM = <E, A, R1, E1, B, R2, E2, C>(f: (e: E) => Managed<R1, E1, B>, g: (a: A) => Managed<R2, E2, C>) => <
   R
>(
   ma: Managed<R, E, A>
): Managed<R & R1 & R2, E1 | E2, B | C> => foldM_(ma, f, g);
