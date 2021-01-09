import type { Fiber } from '../core'

import * as O from '@principia/base/Option'

import * as I from '../_internal/io'
import { makeSynthetic } from '../core'

/**
 * A fiber that never fails or succeeds
 */
export const never: Fiber<never, never> = makeSynthetic({
  _tag: 'SyntheticFiber',
  await: I.never,
  getRef: (fiberRef) => I.succeed(fiberRef.initial),
  interruptAs: () => I.never,
  inheritRefs: I.unit(),
  poll: I.succeed(O.none())
})
