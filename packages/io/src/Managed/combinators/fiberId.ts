import type { FiberId } from '../../Fiber'
import type { Managed } from '../core'

import * as I from '../_internal/_io'
import { fromEffect } from '../core'

export function fiberId(): Managed<unknown, never, FiberId> {
  return fromEffect(I.fiberId())
}
