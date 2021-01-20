import type { SyntheticFiber } from '../core'

import { done } from '../core'
import * as I from '../internal/io'

/**
 * ```haskell
 * fromTask :: Task _ e a -> Task _ _ (Synthetic e a)
 * ```
 *
 * Lifts an `Task` into a `Fiber`.
 */
export const fromEffect = <E, A>(effect: I.FIO<E, A>): I.UIO<SyntheticFiber<E, A>> => I.map_(I.result(effect), done)
