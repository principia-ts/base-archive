import type { UIO } from '../../IO/core'
import type { Fiber } from '../core'
import type { FiberId } from '../FiberId'

import * as Iter from '@principia/base/Iterable'

import { forkDaemon } from '../../IO/combinators/core-scope'
import { fiberId } from '../../IO/combinators/fiberId'
import * as I from '../../IO/core'

/**
 * ```haskell
 * interrupt :: Fiber e a -> IO _ _ (Exit e a)
 * ```
 *
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interrupt = <E, A>(fiber: Fiber<E, A>) => I.bind_(fiberId(), (id) => fiber.interruptAs(id))

/**
 * ```haskell
 * interruptAllAs_ :: (Iterable (Fiber Any Any), FiberId) -> IO _ _ ()
 * ```
 *
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs_ = (fs: Iterable<Fiber<any, any>>, id: FiberId) =>
  Iter.foldl_(fs, I.unit() as UIO<void>, (io, f) => I.asUnit(I.bind_(io, () => f.interruptAs(id))))

/**
 * ```haskell
 * interruptAllAs :: FiberId -> Iterable (Fiber Any Any) -> IO _ _ ()
 * ```
 *
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs = (id: FiberId) => (fs: Iterable<Fiber<any, any>>) => interruptAllAs_(fs, id)

/**
 * ```haskell
 * interruptFork :: Fiber e a -> IO _ _ ()
 * ```
 *
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export const interruptFork = <E, A>(fiber: Fiber<E, A>) => I.asUnit(forkDaemon(interrupt(fiber)))
