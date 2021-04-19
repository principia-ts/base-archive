import type { FiberId } from '../../Fiber'
import type { Managed } from '../core'

import { fromEffect } from '../core'
import * as I from '../internal/_io'

export function fiberId(): Managed<unknown, never, FiberId> {
  return fromEffect(I.fiberId())
}
