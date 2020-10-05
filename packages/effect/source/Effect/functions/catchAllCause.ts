import type { Cause } from "../../Cause";
import * as T from "../core";

/**
 * ```haskell
 * _catchAllCause :: Effect t => (t x r e a, ((Cause e) -> t x1 r1 e1 b)) ->
 *    t (x | x1) (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _catchAllCause = <R, E, A, R1, E1, A1>(
   ef: T.Effect<R, E, A>,
   f: (_: Cause<E>) => T.Effect<R1, E1, A1>
) => T._foldCauseM(ef, f, T.pure);

/**
 * ```haskell
 * _catchAllCause :: Effect t => ((Cause e) -> t x1 r1 e1 b) -> t x r e a ->
 *    t (x | x1) (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAllCause = <E, R1, E1, A1>(f: (_: Cause<E>) => T.Effect<R1, E1, A1>) => <X, R, A>(
   ef: T.Effect<R, E, A>
) => _catchAllCause(ef, f);
