import type { Cause } from "../../Exit/Cause";
import * as T from "../_core";

/**
 * ```haskell
 * catchAllCause_ :: AIO t => (t x r e a, ((Cause e) -> t x1 r1 e1 b)) ->
 *    t (x | x1) (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAllCause_<R, E, A, R1, E1, A1>(
  ef: T.AIO<R, E, A>,
  f: (_: Cause<E>) => T.AIO<R1, E1, A1>
) {
  return T.foldCauseM_(ef, f, T.pure);
}

/**
 * ```haskell
 * catchAllCause :: AIO t => ((Cause e) -> t x1 r1 e1 b) -> t x r e a ->
 *    t (x | x1) (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAllCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => T.AIO<R1, E1, A1>
): <R, A>(ef: T.AIO<R, E, A>) => T.AIO<R & R1, E1, A1 | A> {
  return (ef) => catchAllCause_(ef, f);
}
