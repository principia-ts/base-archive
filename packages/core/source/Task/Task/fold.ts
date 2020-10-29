import * as E from "../../Either";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import { halt } from "./constructors";
import type { Task } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Fold Task
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM_` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Task<R, E, A>,
   onFailure: (cause: Cause<E>) => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
): Task<R & R1 & R2, E1 | E2, A1 | A2> => new FoldInstruction(ma, onFailure, onSuccess);

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   onFailure: (cause: Cause<E>) => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
) => <R>(ma: Task<R, E, A>): Task<R & R1 & R2, E1 | E2, A1 | A2> => new FoldInstruction(ma, onFailure, onSuccess);

export const foldM_ = <R, R1, R2, E, E1, E2, A, A1, A2>(
   ma: Task<R, E, A>,
   onFailure: (e: E) => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
): Task<R & R1 & R2, E1 | E2, A1 | A2> =>
   foldCauseM_(ma, (cause) => E.fold_(C.failureOrCause(cause), onFailure, halt), onSuccess);

export const foldM = <R1, R2, E, E1, E2, A, A1, A2>(
   onFailure: (e: E) => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
) => <R>(ma: Task<R, E, A>): Task<R & R1 & R2, E1 | E2, A1 | A2> => foldM_(ma, onFailure, onSuccess);
