import { zipWithPar_ } from "./apply-par";
import type { AIO } from "./model";

/*
 * -------------------------------------------
 * Parallel Applicative AIO
 * -------------------------------------------
 */

/**
 * Parallely zips two `AIOs`
 */
export function zipPar_<R, E, A, R1, E1, A1>(ma: AIO<R, E, A>, mb: AIO<R1, E1, A1>) {
  return zipWithPar_(ma, mb, (a, b) => [a, b] as const);
}

/**
 * Parallely zips two `AIOs`
 */
export function zipPar<R1, E1, A1>(
  mb: AIO<R1, E1, A1>
): <R, E, A>(ma: AIO<R, E, A>) => AIO<R & R1, E1 | E, readonly [A, A1]> {
  return (ma) => zipPar_(ma, mb);
}
