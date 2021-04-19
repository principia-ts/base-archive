import type { IO } from '../../IO/core'
import type { Managed } from '../core'

import { onExitFirst, onExitFirst_ } from './onExitFirst'

/**
 * Ensures that `f` is executed when this `Managed` is finalized, before
 * the existing finalizer.
 *
 * For use cases that need access to the Managed's result, see `onExitFirst`.
 */
export function ensuringFirst<R1>(
  f: IO<R1, never, unknown>
): <R, E, A>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  return onExitFirst(() => f)
}

/**
 * Ensures that `f` is executed when this `Managed` is finalized, before
 * the existing finalizer.
 *
 * For use cases that need access to the Managed's result, see `onExitFirst_`.
 */
export function ensuringFirst_<R, E, A, R1>(self: Managed<R, E, A>, f: IO<R1, never, unknown>): Managed<R & R1, E, A> {
  return onExitFirst_(self, () => f)
}
