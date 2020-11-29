import type { Cause } from "../../Exit/Cause/model";
import type { AIO } from "../_core";
import { foldCauseM_, halt, pure } from "../_core";

/**
 * ```haskell
 * mapErrorCause_ :: AIO t => (t x r e a, (Cause e -> Cause e1)) -> t x r e1 a
 * ```
 *
 * Returns an AIO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause_ = <R, E, A, E1>(
  ef: AIO<R, E, A>,
  f: (cause: Cause<E>) => Cause<E1>
): AIO<R, E1, A> => foldCauseM_(ef, (c) => halt(f(c)), pure);

/**
 * ```haskell
 * mapErrorCause :: AIO t => (Cause e -> Cause e1) -> t x r e a -> t x r e1 a
 * ```
 *
 * Returns an AIO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause = <E, E1>(f: (cause: Cause<E>) => Cause<E1>) => <R, A>(
  ef: AIO<R, E, A>
): AIO<R, E1, A> => mapErrorCause_(ef, f);
