import type { IO } from "../core";

import { flatMap_, pure } from "../core";

/**
 * ```haskell
 * repeatN_ :: (IO r e a, Number) -> IO r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN_<R, E, A>(ef: IO<R, E, A>, n: number): IO<R, E, A> {
  return flatMap_(ef, (a) => (n <= 0 ? pure(a) : repeatN_(ef, n - 1)));
}

/**
 * ```haskell
 * repeatN :: Number -> IO r e a -> IO r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN(n: number): <R, E, A>(ef: IO<R, E, A>) => IO<R, E, A> {
  return (ef) => repeatN_(ef, n);
}
