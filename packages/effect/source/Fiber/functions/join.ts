import * as T from "../../Effect/core";
import { Fiber } from "../Fiber";

/**
 * ```haskell
 * join :: (Fiber f, Effect t) => f e a -> t ^ _ e a
 * ```
 *
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by another
 * fiber, "inner interruption" can be caught and recovered.
 */
export const join = <E, A>(fiber: Fiber<E, A>): T.IO<E, A> =>
   T._tap(T._chain(fiber.await, T.done), () => fiber.inheritRefs);
