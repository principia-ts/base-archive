import type { IO } from '../core'
import type { Option } from '@principia/base/data/Option'

import * as O from '@principia/base/data/Option'

import { fail } from '../core'
import { rejectM_ } from './rejectM'

/**
 * ```haskell
 * reject_ :: (IO r e a, (a -> Option e1)) -> IO r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject_<R, E, A, E1>(fa: IO<R, E, A>, pf: (a: A) => Option<E1>): IO<R, E | E1, A> {
  return rejectM_(fa, (a) => O.map_(pf(a), fail))
}

/**
 * ```haskell
 * reject :: (a -> Option e1) -> IO r e a -> IO r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>): <R, E>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
  return (fa) => reject_(fa, pf)
}
