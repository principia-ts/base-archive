// tracing: off

import type { UIO } from '../core'

import { deferTotal, effectTotal } from '../core'
import { effectAsyncInterrupt } from './interrupt'

/**
 * Returns a `IO` that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never: UIO<never> = deferTotal(() =>
  effectAsyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return effectTotal(() => {
      clearInterval(interval)
    })
  })
)
