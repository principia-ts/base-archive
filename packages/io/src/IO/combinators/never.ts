import type { UIO } from '../core'

import { suspend, total } from '../core'
import { asyncInterrupt } from './interrupt'

/**
 * Returns a `IO` that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never: UIO<never> = suspend(() =>
  asyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return total(() => {
      clearInterval(interval)
    })
  })
)
