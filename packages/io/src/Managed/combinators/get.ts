import type { Managed } from '../core'

import * as E from '@principia/base/data/Either'
import * as O from '@principia/base/data/Option'

import { absolve, map_ } from '../core'

/**
 * Unwraps the optional success of this effect, but can fail with None value.
 */
export function get<R, A>(ma: Managed<R, never, O.Option<A>>): Managed<R, O.Option<never>, A> {
  return absolve(
    map_(
      ma,
      E.fromOption(() => O.none())
    )
  )
}
