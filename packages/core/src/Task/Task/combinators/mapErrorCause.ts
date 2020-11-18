import type { Task } from "../_core";
import { foldCauseM_, halt, pure } from "../_core";
import type { Cause } from "../../Exit/Cause/model";

/**
 * ```haskell
 * mapErrorCause_ :: Task t => (t x r e a, (Cause e -> Cause e1)) -> t x r e1 a
 * ```
 *
 * Returns a task with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause_ = <R, E, A, E1>(
  ef: Task<R, E, A>,
  f: (cause: Cause<E>) => Cause<E1>
): Task<R, E1, A> => foldCauseM_(ef, (c) => halt(f(c)), pure);

/**
 * ```haskell
 * mapErrorCause :: Task t => (Cause e -> Cause e1) -> t x r e a -> t x r e1 a
 * ```
 *
 * Returns a task with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause = <E, E1>(f: (cause: Cause<E>) => Cause<E1>) => <R, A>(
  ef: Task<R, E, A>
): Task<R, E1, A> => mapErrorCause_(ef, f);
