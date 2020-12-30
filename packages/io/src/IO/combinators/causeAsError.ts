import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { fail, foldCauseM_, pure } from '../core'

export function causeAsError<R, E, A>(fa: IO<R, E, A>): IO<R, Cause<E>, A> {
  return foldCauseM_(fa, fail, pure)
}
