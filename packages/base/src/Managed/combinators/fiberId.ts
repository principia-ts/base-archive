// tracing: off

import type { FiberId } from '../../Fiber'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { fromEffect } from '../core'
import * as I from '../internal/_io'

/**
 * @trace call
 */
export function fiberId(): Managed<unknown, never, FiberId> {
  const trace = accessCallTrace()
  return traceCall(fromEffect, trace)(I.fiberId())
}
