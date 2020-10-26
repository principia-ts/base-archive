import type { Task } from "../model";
import { mapBothPar_ } from "./mapBothPar";

/**
 * Parallely zips this effects
 */
export const bothPar_ = <R, E, A, R1, E1, A1>(ma: Task<R, E, A>, mb: Task<R1, E1, A1>) =>
   mapBothPar_(ma, mb, (a, b) => [a, b] as const);

/**
 * Parallely zips this effects
 */
export const bothPar = <R1, E1, A1>(mb: Task<R1, E1, A1>) => <R, E, A>(ma: Task<R, E, A>) => bothPar_(ma, mb);
