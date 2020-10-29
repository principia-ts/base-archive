import { pipe } from "../../Function";
import type { Cause } from "../Exit/Cause";
import * as T from "./_internal/task";
import { Managed } from "./model";

/*
 * -------------------------------------------
 * Fold Managed
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   f: (cause: Cause<E>) => Managed<R1, E1, A1>,
   g: (a: A) => Managed<R2, E2, A2>
) => <R>(self: Managed<R, E, A>) => foldCauseM_(self, f, g);

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   self: Managed<R, E, A>,
   f: (cause: Cause<E>) => Managed<R1, E1, A1>,
   g: (a: A) => Managed<R2, E2, A2>
) =>
   new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
      pipe(
         self.task,
         T.foldCauseM(
            (c) => f(c).task,
            ([_, a]) => g(a).task
         )
      )
   );
