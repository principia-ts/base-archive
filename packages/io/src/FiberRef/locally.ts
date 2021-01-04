import type { IO } from './_internal/io'
import type { FiberRef } from './core'

import * as I from './_internal/io'
import { get, set } from './core'

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export function locally_<A, R, E, B>(fiberRef: FiberRef<A>, value: A, use: IO<R, E, B>): I.IO<R, E, B> {
  return I.flatMap_(get(fiberRef), (oldValue) =>
    I.bracket_(
      set(value)(fiberRef),
      () => use,
      () => set(oldValue)(fiberRef)
    )
  )
}

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export function locally<A, R, E, B>(value: A, use: IO<R, E, B>): (fiberRef: FiberRef<A>) => IO<R, E, B> {
  return (fiberRef) => locally_(fiberRef, value, use)
}
