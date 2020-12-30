import type { Managed } from '../core'

import * as O from '@principia/base/data/Option'

import { fold_ } from '../core'

export function option<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, O.Option<A>> {
  return fold_(ma, () => O.none(), O.some)
}
