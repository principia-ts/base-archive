import type { UIO } from '../../IO/core'
import type { Fiber } from '../core'
import type { FiberId } from '../FiberId'

import { forkDaemon } from '../../IO/combinators/core-scope'
import * as I from '../../IO/core'
import * as Iter from '../../Iterable'

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interrupt = <E, A>(fiber: Fiber<E, A>) => I.bind_(I.fiberId(), (id) => fiber.interruptAs(id))

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs_ = (fs: Iterable<Fiber<any, any>>, id: FiberId) =>
  Iter.foldl_(fs, I.unit() as UIO<void>, (io, f) => I.asUnit(I.bind_(io, () => f.interruptAs(id))))

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs = (id: FiberId) => (fs: Iterable<Fiber<any, any>>) => interruptAllAs_(fs, id)

/**
 *
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export const interruptFork = <E, A>(fiber: Fiber<E, A>) => I.asUnit(forkDaemon(interrupt(fiber)))
