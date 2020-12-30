import type { Managed } from '../core'

import * as E from '@principia/base/data/Either'

import { fold_ } from '../core'

export function either<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, E.Either<E, A>> {
  return fold_(ma, E.left, E.right)
}
