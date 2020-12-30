import type { IO } from '../core'

import { identity } from '@principia/base/data/Function'

import { orDieWith_ } from './orDieWith'

export function orDie<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  return orDieWith_(ma, identity)
}
