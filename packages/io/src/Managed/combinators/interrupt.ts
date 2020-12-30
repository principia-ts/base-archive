import type { FiberId } from '../../Fiber'
import type { Managed } from '../core'

import * as C from '../../Cause/core'
import * as I from '../_internal/io'
import { chain_, fromEffect, halt } from '../core'

/**
 * Returns a Managed that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: Managed<unknown, never, never> = chain_(
  fromEffect(I.descriptorWith((d) => I.succeed(d.id))),
  (id) => halt(C.interrupt(id))
)

/**
 * Returns a Managed that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberId): Managed<unknown, never, never> {
  return halt(C.interrupt(fiberId))
}
