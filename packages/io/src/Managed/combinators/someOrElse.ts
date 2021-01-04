import type { Managed } from '../core'

import * as O from '@principia/base/data/Option'

import { chain_, map_, succeed } from '../core'

export function someOrElse_<R, E, A, B>(ma: Managed<R, E, O.Option<A>>, onNone: () => B): Managed<R, E, A | B> {
  return map_(ma, O.getOrElse(onNone))
}

export function someOrElse<B>(onNone: () => B): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A | B> {
  return (ma) => someOrElse_(ma, onNone)
}

export function someOrElseM_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, O.Option<A>>,
  onNone: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return chain_(
    ma,
    O.fold((): Managed<R1, E1, A | B> => onNone, succeed)
  )
}

export function someOrElseM<R1, E1, B>(
  onNone: Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => someOrElseM_(ma, onNone)
}
