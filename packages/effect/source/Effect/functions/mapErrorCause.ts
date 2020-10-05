import type { Cause } from "../../Cause/Cause";
import { _foldCauseM, Effect, halt, pure } from "../core";

/**
 * ```haskell
 * _mapErrorCause :: Effect t => (t x r e a, (Cause e -> Cause e1)) -> t x r e1 a
 * ```
 *
 * Returns an effect with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _mapErrorCause = <R, E, A, E1>(
   ef: Effect<R, E, A>,
   f: (cause: Cause<E>) => Cause<E1>
): Effect<R, E1, A> => _foldCauseM(ef, (c) => halt(f(c)), pure);

/**
 * ```haskell
 * mapErrorCause :: Effect t => (Cause e -> Cause e1) -> t x r e a -> t x r e1 a
 * ```
 *
 * Returns an effect with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause = <E, E1>(f: (cause: Cause<E>) => Cause<E1>) => <R, A>(
   ef: Effect<R, E, A>
): Effect<R, E1, A> => _mapErrorCause(ef, f);
