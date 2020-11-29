import * as T from "../_internal/aio";
import { done } from "../constructors";
import type { SyntheticFiber } from "../model";

/**
 * ```haskell
 * fromTask :: Task _ e a -> Task _ _ (Synthetic e a)
 * ```
 *
 * Lifts an `Task` into a `Fiber`.
 */
export const fromEffect = <E, A>(effect: T.EIO<E, A>): T.IO<SyntheticFiber<E, A>> =>
  T.map_(T.result(effect), done);
