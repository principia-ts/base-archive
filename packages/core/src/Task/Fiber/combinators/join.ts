import * as T from "../../Task/_core";
import type { EIO } from "../../Task/model";
import type { Fiber } from "../model";

/**
 * ```haskell
 * join :: Fiber e a -> Task _ e a
 * ```
 *
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by another
 * fiber, "inner interruption" can be caught and recovered.
 */
export const join = <E, A>(fiber: Fiber<E, A>): EIO<E, A> =>
  T.tap_(T.chain_(fiber.await, T.done), () => fiber.inheritRefs);
