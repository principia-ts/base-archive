import * as I from "../../../Iterable";
import * as T from "../../Task/core";
import { forkDaemon } from "../../Task/core-scope";
import { checkFiberId } from "../../Task/functions/checkFiberId";
import type { UIO } from "../../Task/model";
import type { FiberId } from "../FiberId";
import type { Fiber } from "../model";

/**
 * ```haskell
 * interrupt :: Fiber e a -> Task _ _ (Exit e a)
 * ```
 *
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interrupt = <E, A>(fiber: Fiber<E, A>) => T.chain_(checkFiberId(), (id) => fiber.interruptAs(id));

/**
 * ```haskell
 * interruptAllAs_ :: (Iterable (Fiber Any Any), FiberId) -> Task _ _ ()
 * ```
 *
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs_ = (fs: Iterable<Fiber<any, any>>, id: FiberId) =>
   I.reduce_(fs, T.unit as UIO<void>, (io, f) => T.asUnit(T.chain_(io, () => f.interruptAs(id))));

/**
 * ```haskell
 * interruptAllAs :: FiberId -> Iterable (Fiber Any Any) -> Task _ _ ()
 * ```
 *
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs = (id: FiberId) => (fs: Iterable<Fiber<any, any>>) => interruptAllAs_(fs, id);

/**
 * ```haskell
 * interruptFork :: Fiber e a -> Task _ _ ()
 * ```
 *
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export const interruptFork = <E, A>(fiber: Fiber<E, A>) => T.asUnit(forkDaemon(interrupt(fiber)));
