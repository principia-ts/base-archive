import { tuple } from "../Function";
import { mapBothPar_ } from "./apply-par";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Parallel Applicative Async
 * -------------------------------------------
 */

export const bothPar_ = <R, E, A, R1, E1, A1>(
   fa: Async<R, E, A>,
   fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> => mapBothPar_(fa, fb, tuple);

export const bothPar = <R1, E1, A1>(fb: Async<R1, E1, A1>) => <R, E, A>(
   fa: Async<R, E, A>
): Async<R & R1, E | E1, readonly [A, A1]> => bothPar_(fa, fb);
