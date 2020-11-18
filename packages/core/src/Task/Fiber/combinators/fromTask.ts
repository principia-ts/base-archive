import * as T from "../_internal/task";
import { done } from "../constructors";
import type { SyntheticFiber } from "../model";

/**
 * ```haskell
 * fromTask :: Task _ e a -> Task _ _ (Synthetic e a)
 * ```
 *
 * Lifts an `Task` into a `Fiber`.
 */
export const fromTask = <E, A>(effect: T.EIO<E, A>): T.IO<SyntheticFiber<E, A>> =>
  T.map_(T.result(effect), done);
