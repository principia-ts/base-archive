import * as T from "../_internal/aio";
import { halt } from "../constructors";
import type { Fiber } from "../model";

/**
 * ```haskell
 * _mapFiber :: (Fiber e a, (a -> Fiber e1 a1)) ->
 *    AIO _ _ (Fiber (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber_ = <A, E, E1, A1>(
  fiber: Fiber<E, A>,
  f: (a: A) => Fiber<E1, A1>
): T.IO<Fiber<E | E1, A1>> =>
  T.map_(fiber.await, (ex) => {
    switch (ex._tag) {
      case "Success": {
        return f(ex.value);
      }
      case "Failure": {
        return halt(ex.cause);
      }
    }
  });

/**
 * ```haskell
 * mapFiber :: (a -> Fiber e1 a1) -> Fiber e a -> AIO _ _ (Fiber (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber = <E1, A, B>(f: (a: A) => Fiber<E1, B>) => <E>(
  fiber: Fiber<E, A>
): T.IO<Fiber<E | E1, B>> => mapFiber_(fiber, f);
