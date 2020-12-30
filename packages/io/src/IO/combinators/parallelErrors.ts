import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import * as C from '../../Cause/core'
import * as I from '../core'

/**
 * Exposes all parallel errors in a single call
 */
export function parallelErrors<R, E, A>(io: IO<R, E, A>): IO<R, ReadonlyArray<E>, A> {
  return I.foldCauseM_(
    io,
    (cause) => {
      const f = C.failures(cause)

      if (f.length === 0) {
        return I.halt(cause as Cause<never>)
      } else {
        return I.fail(f)
      }
    },
    I.succeed
  )
}
