import * as T from "../_internal/effect";
import { done, Synthetic } from "../core";

/**
 * ```haskell
 * fromEffect :: Effect t => t ^ _ e a -> t ^ _ _ (Synthetic e a)
 * ```
 *
 * Lifts an `Effect` into a `Fiber`.
 */
export const fromEffect = <E, A>(effect: T.IO<E, A>): T.UIO<Synthetic<E, A>> =>
   T._map(T.result(effect), done);
