import * as I from "@principia/core/Iterable";

import * as T from "../_internal/effect";
import type { Fiber, FiberId } from "../core";

/**
 * ```haskell
 * interrupt :: (Effect t, Fiber f) => f e a -> t ^ _ _ (Exit e a)
 * ```
 *
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interrupt = <E, A>(fiber: Fiber<E, A>) =>
   T._chain(T.checkFiberId(), (id) => fiber.interruptAs(id));

/**
 * ```haskell
 * interruptAllAs :: FiberId -> Iterable (Fiber Any Any) -> Effect ^ _ _ Void
 * ```
 *
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs = (id: FiberId) => (fs: Iterable<Fiber<any, any>>) =>
   I.reduce_(fs, T.unit as T.UIO<void>, (io, f) => T.asUnit(T._chain(io, () => f.interruptAs(id))));

/**
 * ```haskell
 * interruptFork :: (Fiber f, Effect t) => f e a -> t ^ _ _ Void
 * ```
 *
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export const interruptFork = <E, A>(fiber: Fiber<E, A>) => T.asUnit(T.forkDaemon(interrupt(fiber)));
