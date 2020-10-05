import { matchTag } from "@principia/core/Utils";

import * as T from "../_internal/effect";
import { halt } from "../core";
import type { Fiber } from "../Fiber";

/**
 * ```haskell
 * _mapFiber :: (Fiber f, Effect t) => (f e a, (a -> f e1 a1)) ->
 *    t ^ _ _ (f (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const _mapFiber = <A, E, E1, A1>(
   fiber: Fiber<E, A>,
   f: (a: A) => Fiber<E1, A1>
): T.UIO<Fiber<E | E1, A1>> =>
   T._map(
      fiber.await,
      matchTag({
         Success: (ex) => f(ex.value),
         Failure: (ex) => halt(ex.cause)
      })
   );

/**
 * ```haskell
 * mapFiber :: (Fiber f, Effect t) => (a -> f e1 a1) ->
 *    f e a -> t ^ _ _ (f (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber = <E1, A, B>(f: (a: A) => Fiber<E1, B>) => <E>(
   fiber: Fiber<E, A>
): T.UIO<Fiber<E | E1, B>> => _mapFiber(fiber, f);
