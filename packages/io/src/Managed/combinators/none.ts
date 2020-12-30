import type { Managed } from '../core'

import { flow } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import { fail, foldM_, unit } from '../core'

/**
 * Requires the option produced by this value to be `None`.
 */
export function none<R, E, A>(ma: Managed<R, E, O.Option<A>>): Managed<R, O.Option<E>, void> {
  return foldM_(
    ma,
    flow(O.some, fail),
    O.fold(
      () => unit(),
      () => fail(O.none())
    )
  )
}
