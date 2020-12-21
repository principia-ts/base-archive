import type { Cause } from "../../Cause/core";

import * as I from "../core";

/**
 * ```haskell
 * catchAllCause_ :: IO t => (t x r e a, ((Cause e) -> t x1 r1 e1 b)) ->
 *    t (x | x1) (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAllCause_<R, E, A, R1, E1, A1>(
  ef: I.IO<R, E, A>,
  f: (_: Cause<E>) => I.IO<R1, E1, A1>
) {
  return I.foldCauseM_(ef, f, I.pure);
}

/**
 * ```haskell
 * catchAllCause :: IO t => ((Cause e) -> t x1 r1 e1 b) -> t x r e a ->
 *    t (x | x1) (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAllCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => I.IO<R1, E1, A1>
): <R, A>(ef: I.IO<R, E, A>) => I.IO<R & R1, E1, A1 | A> {
  return (ef) => catchAllCause_(ef, f);
}
