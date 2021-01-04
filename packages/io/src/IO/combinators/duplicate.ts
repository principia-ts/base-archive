import type { IO } from '../core'

import { identity } from '@principia/base/data/Function'

import { extend_ } from './extend'

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w w a
 * ```
 */
export function duplicate<R, E, A>(wa: IO<R, E, A>): IO<R, E, IO<R, E, A>> {
  return extend_(wa, identity)
}
