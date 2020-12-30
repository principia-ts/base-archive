import type { Managed } from '../core'

import { fold_ } from '../core'

/**
 * Ignores the success or failure of a Managed
 */
export function ignore<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, void> {
  return fold_(
    ma,
    () => {
      /* */
    },
    () => {
      /* */
    }
  )
}
