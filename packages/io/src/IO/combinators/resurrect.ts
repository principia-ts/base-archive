import type { IO } from '../core'

import { identity } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import { unrefineWith_ } from './unrefineWith'

/**
 * Recover from the unchecked failure of the `IO`. (opposite of `orDie`)
 */
export function resurrect<R, E, A>(io: IO<R, E, A>): IO<R, unknown, A> {
  return unrefineWith_(io, O.some, identity)
}
