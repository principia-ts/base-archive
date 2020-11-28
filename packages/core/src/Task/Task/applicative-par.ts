import { zipWithPar_ } from "./apply-par";
import type { Task } from "./model";

/*
 * -------------------------------------------
 * Parallel Applicative Task
 * -------------------------------------------
 */

/**
 * Parallely zips two `Tasks`
 */
export function zipPar_<R, E, A, R1, E1, A1>(ma: Task<R, E, A>, mb: Task<R1, E1, A1>) {
  return zipWithPar_(ma, mb, (a, b) => [a, b] as const);
}

/**
 * Parallely zips two `Tasks`
 */
export function zipPar<R1, E1, A1>(
  mb: Task<R1, E1, A1>
): <R, E, A>(ma: Task<R, E, A>) => Task<R & R1, E1 | E, readonly [A, A1]> {
  return (ma) => zipPar_(ma, mb);
}
