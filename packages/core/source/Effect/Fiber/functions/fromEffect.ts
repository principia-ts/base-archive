import * as T from "../_internal/effect";
import { done } from "../core";
import type { SyntheticFiber } from "../Fiber";

/**
 * ```haskell
 * fromEffect :: Effect t => t ^ _ e a -> t ^ _ _ (Synthetic e a)
 * ```
 *
 * Lifts an `Effect` into a `Fiber`.
 */
export const fromEffect = <E, A>(effect: T.IO<E, A>): T.UIO<SyntheticFiber<E, A>> => T.map_(T.result(effect), done);
