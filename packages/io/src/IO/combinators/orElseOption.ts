import type { IO } from '../core'
import type { Option } from '@principia/base/data/Option'

import * as O from '@principia/base/data/Option'

import { catchAll_ } from '../core'

export function orElseOption_<R, E, A, R1, E1, A1>(
  ma: IO<R, Option<E>, A>,
  that: () => IO<R1, Option<E1>, A1>
): IO<R & R1, Option<E | E1>, A | A1> {
  return catchAll_(
    ma,
    O.fold(that, (e) => fail(O.some<E | E1>(e)))
  )
}

export function orElseOption<R1, E1, A1>(
  that: () => IO<R1, Option<E1>, A1>
): <R, E, A>(ma: IO<R, Option<E>, A>) => IO<R & R1, Option<E1 | E>, A1 | A> {
  return (ma) => orElseOption_(ma, that)
}
