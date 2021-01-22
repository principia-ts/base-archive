import type { IO } from '../core'

import * as Fiber from '../../Fiber'
import { bind_ } from '../core'

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiberM<R, E, A, E1>(fiber: IO<R, E, Fiber.Fiber<E1, A>>): IO<R, E | E1, A> {
  return bind_(fiber, Fiber.join)
}
