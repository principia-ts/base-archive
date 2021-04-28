import type { IO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import * as Fiber from '../../Fiber'
import { flow } from '../../function'
import { bind_ } from '../core'

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 *
 * @trace call
 */
export function fromFiberM<R, E, A, E1>(fiber: IO<R, E, Fiber.Fiber<E1, A>>): IO<R, E | E1, A> {
  const trace = accessCallTrace()
  return bind_(fiber, traceFrom(trace, flow(Fiber.join)))
}
