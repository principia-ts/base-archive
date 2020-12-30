import type { IO } from '../core'

import { ask, product_ } from '../core'

/**
 * Zips the success of this IO with its environment
 */
export function zipEnv<R, E, A>(ma: IO<R, E, A>): IO<R, E, readonly [A, R]> {
  return product_(ma, ask<R>())
}
