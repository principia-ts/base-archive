import type { Managed } from '../core'

import { unit } from '../core'
import { asUnit } from './as'
import { suspend } from './suspend'

export function when_<R, E, A>(ma: Managed<R, E, A>, b: boolean): Managed<R, E, void> {
  return suspend(() => (b ? asUnit(ma) : unit()))
}

export function when(b: boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
  return (ma) => when_(ma, b)
}
