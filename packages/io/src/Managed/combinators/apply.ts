import type * as I from '../_internal/io'
import type { Finalizer, ReleaseMap } from '../ReleaseMap'

import { Managed } from '../core'

export function apply<R, E, A>(io: I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>): Managed<R, E, A> {
  return new Managed(io)
}
