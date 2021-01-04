import type { IO } from '../core'

import { fail, foldM_, pure } from '../core'

/**
 * ```haskell
 * swap :: Bifunctor p => p a b -> p b a
 * ```
 *
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category AltBifunctor?
 * @since 1.0.0
 */
export function swap<R, E, A>(pab: IO<R, E, A>): IO<R, A, E> {
  return foldM_(pab, pure, fail)
}
