import { zipWithPar_ } from "./apply-par";
import type { IO } from "./model";

/*
 * -------------------------------------------
 * Parallel Applicative IO
 * -------------------------------------------
 */

/**
 * Parallely zips two `IOs`
 */
export function zipPar_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, mb: IO<R1, E1, A1>) {
  return zipWithPar_(ma, mb, (a, b) => [a, b] as const);
}

/**
 * Parallely zips two `IOs`
 */
export function zipPar<R1, E1, A1>(
  mb: IO<R1, E1, A1>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, readonly [A, A1]> {
  return (ma) => zipPar_(ma, mb);
}
