import * as I from "../_internal/io";
import { halt } from "../constructors";
import type { Fiber } from "../model";

/**
 * ```haskell
 * _mapFiber :: (Fiber e a, (a -> Fiber e1 a1)) ->
 *    IO _ _ (Fiber (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber_ = <A, E, E1, A1>(
  fiber: Fiber<E, A>,
  f: (a: A) => Fiber<E1, A1>
): I.UIO<Fiber<E | E1, A1>> =>
  I.map_(fiber.await, (ex) => {
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
 * mapFiber :: (a -> Fiber e1 a1) -> Fiber e a -> IO _ _ (Fiber (e | e1) a1)
 * ```
 *
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber = <E1, A, B>(f: (a: A) => Fiber<E1, B>) => <E>(
  fiber: Fiber<E, A>
): I.UIO<Fiber<E | E1, B>> => mapFiber_(fiber, f);
