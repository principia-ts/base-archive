import type { Effect } from "../Effect";
import { mapBothPar_ } from "./mapBothPar";

/**
 * Parallely zips this effects
 */
export const bothPar_ = <R, E, A, R1, E1, A1>(ma: Effect<R, E, A>, mb: Effect<R1, E1, A1>) =>
   mapBothPar_(ma, mb, (a, b) => [a, b] as const);

/**
 * Parallely zips this effects
 */
export const bothPar = <R1, E1, A1>(mb: Effect<R1, E1, A1>) => <R, E, A>(ma: Effect<R, E, A>) => bothPar_(ma, mb);
