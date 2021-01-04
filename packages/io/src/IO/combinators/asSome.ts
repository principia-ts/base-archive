import type { IO } from '../core'
import type { Option } from '@principia/base/data/Option'

import { some } from '@principia/base/data/Option'

import { map_ } from '../core'

/**
 * ```haskell
 * asSome :: IO r e a -> IO r e (Option a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(ef: IO<R, E, A>): IO<R, E, Option<A>> {
  return map_(ef, some)
}
