import type { Managed } from '../core'

import { chain_, succeed } from '../core'

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function ifM_<R, E, R1, E1, B, R2, E2, C>(
  mb: Managed<R, E, boolean>,
  onTrue: () => Managed<R1, E1, B>,
  onFalse: () => Managed<R2, E2, C>
): Managed<R & R1 & R2, E | E1 | E2, B | C> {
  return chain_(mb, (b) => (b ? (onTrue() as Managed<R & R1 & R2, E | E1 | E2, B | C>) : onFalse()))
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function ifM<R1, E1, B, R2, E2, C>(onTrue: () => Managed<R1, E1, B>, onFalse: () => Managed<R2, E2, C>) {
  return <R, E>(mb: Managed<R, E, boolean>): Managed<R & R1 & R2, E | E1 | E2, B | C> => ifM_(mb, onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function if_<R, E, A, R1, E1, B>(
  b: boolean,
  onTrue: () => Managed<R, E, A>,
  onFalse: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return ifM_(succeed(b), onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
function _if<R, E, A, R1, E1, B>(onTrue: () => Managed<R, E, A>, onFalse: () => Managed<R1, E1, B>) {
  return (b: boolean): Managed<R & R1, E | E1, A | B> => if_(b, onTrue, onFalse)
}
export { _if as if }
