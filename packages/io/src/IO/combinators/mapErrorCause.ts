import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { foldCauseM_, halt, pure } from '../core'

/**
 * ```haskell
 * mapErrorCause_ :: IO t => (t x r e a, (Cause e -> Cause e1)) -> t x r e1 a
 * ```
 *
 * Returns an IO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause_ = <R, E, A, E1>(ef: IO<R, E, A>, f: (cause: Cause<E>) => Cause<E1>): IO<R, E1, A> =>
  foldCauseM_(ef, (c) => halt(f(c)), pure)

/**
 * ```haskell
 * mapErrorCause :: IO t => (Cause e -> Cause e1) -> t x r e a -> t x r e1 a
 * ```
 *
 * Returns an IO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const mapErrorCause = <E, E1>(f: (cause: Cause<E>) => Cause<E1>) => <R, A>(ef: IO<R, E, A>): IO<R, E1, A> =>
  mapErrorCause_(ef, f)
