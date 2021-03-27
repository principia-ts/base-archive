import type { IO, UIO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { getAndSet_, makeRef } from '../../Ref'
import * as I from '../core'

/**
 * Returns an IO that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @trace call
 */
export function once<R, E, A>(io: IO<R, E, A>): UIO<IO<R, E, void>> {
  const trace = accessCallTrace()
  return I.map_(
    makeRef(true),
    traceFrom(trace, (ref) => I.whenM_(io, getAndSet_(ref, false)))
  )
}
