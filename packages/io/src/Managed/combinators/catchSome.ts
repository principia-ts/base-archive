import type { Cause } from '../../Cause'
import type { Managed } from '../core'

import * as O from '@principia/base/data/Option'

import { catchAll_, catchAllCause_, fail, halt } from '../core'

export function catchSome_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAll_(ma, (e) => O.getOrElse_(pf(e), () => fail<E | E1>(e)))
}

export function catchSome<E, R1, E1, B>(
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSome_(ma, pf)
}

export function catchSomeCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAllCause_(ma, (e) => O.getOrElse_(pf(e), () => halt<E | E1>(e)))
}

export function catchSomeCause<E, R1, E1, B>(
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSomeCause_(ma, pf)
}
