import type { IO } from '../core'

import { fold_ } from '../core'

/**
 * Folds a `IO` to a boolean describing whether or not it is a failure
 */
export const isFailure = <R, E, A>(io: IO<R, E, A>): IO<R, never, boolean> =>
  fold_(
    io,
    () => true,
    () => false
  )
