import { matchTag } from "@principia/prelude/Utils";

import * as T from "../_internal/task";
import { halt } from "../core";
import type { Fiber } from "../model";

/**
 * ```haskell
 * _mapFiber :: (Fiber e a, (a -> Fiber e1 a1)) ->
 *    Task _ _ (Fiber (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber_ = <A, E, E1, A1>(fiber: Fiber<E, A>, f: (a: A) => Fiber<E1, A1>): T.UIO<Fiber<E | E1, A1>> =>
   T.map_(
      fiber.await,
      matchTag({
         Success: (ex) => f(ex.value),
         Failure: (ex) => halt(ex.cause)
      })
   );

/**
 * ```haskell
 * mapFiber :: (a -> Fiber e1 a1) -> Fiber e a -> Task _ _ (Fiber (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber = <E1, A, B>(f: (a: A) => Fiber<E1, B>) => <E>(fiber: Fiber<E, A>): T.UIO<Fiber<E | E1, B>> =>
   mapFiber_(fiber, f);
