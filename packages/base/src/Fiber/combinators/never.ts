import type { Fiber } from '../core'

import * as O from '../../Option'
import { syntheticFiber } from '../core'
import * as I from '../internal/io'

/**
 * A fiber that never fails or succeeds
 */
export const never: Fiber<never, never> = syntheticFiber({
  _tag: 'SyntheticFiber',
  await: I.never,
  getRef: (fiberRef) => I.succeedNow(fiberRef.initial),
  interruptAs: () => I.never,
  inheritRefs: I.unit(),
  poll: I.succeedNow(O.none())
})
