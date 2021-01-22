import type { Layer } from '../../Layer'
import type { Managed } from '../core'

import { build } from '../../Layer'
import { bind_, gives_ } from '../core'

export function giveLayer_<R, E, A, R1, E1, A1>(
  ma: Managed<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): Managed<R & R1, E | E1, A> {
  return bind_(build(layer), (p) => gives_(ma, (r: R & R1) => ({ ...r, ...p })))
}

export function giveLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  return <R, E, A>(ma: Managed<R & A1, E, A>): Managed<R & R1, E | E1, A> =>
    bind_(build(layer), (p) => gives_(ma, (r: R & R1) => ({ ...r, ...p })))
}
