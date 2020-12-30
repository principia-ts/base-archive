import type { FIO } from '../core'

import * as Fiber from '../../Fiber'
import { flatMap_, total } from '../core'

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): FIO<E, A> {
  return flatMap_(total(fiber), Fiber.join)
}
