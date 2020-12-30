import type { Managed } from '../core'

import { fail, foldM_, succeed } from '../core'

export const swap = <R, E, A>(ma: Managed<R, E, A>): Managed<R, A, E> => foldM_(ma, succeed, fail)

export function swapWith_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): Managed<R1, E1, B> {
  return swap(f(swap(ma)))
}

export function swapWith<R, E, A, R1, E1, B>(
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): (ma: Managed<R, E, A>) => Managed<R1, E1, B> {
  return (ma) => swapWith_(ma, f)
}
