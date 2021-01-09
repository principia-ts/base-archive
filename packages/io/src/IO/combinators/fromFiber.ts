import type { FIO } from '../core'

import * as Fiber from '../../Fiber'
import { effectTotal, flatMap_ } from '../core'

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): FIO<E, A> {
  return flatMap_(effectTotal(fiber), Fiber.join)
}
