import * as T from "../_internal/task";
import { done } from "../core";
import type { SyntheticFiber } from "../model";

/**
 * ```haskell
 * fromTask :: Task t => t ^ _ e a -> t ^ _ _ (Synthetic e a)
 * ```
 *
 * Lifts an `Task` into a `Fiber`.
 */
export const fromTask = <E, A>(effect: T.EIO<E, A>): T.IO<SyntheticFiber<E, A>> => T.map_(T.result(effect), done);
