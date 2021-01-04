import type { Managed } from '../core'

import { succeed } from '../core'
import { orElse_ } from './orElse'

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A1>(ma: Managed<R, E, A>, that: () => A1): Managed<R, E, A | A1> {
  return orElse_(ma, () => succeed(that()))
}

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed<A1>(that: () => A1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, A1 | A> {
  return (ma) => orElseSucceed_(ma, that)
}
