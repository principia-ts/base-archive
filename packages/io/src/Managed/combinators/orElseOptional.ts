import type { Managed } from '../core'

import * as O from '@principia/base/data/Option'

import { catchAll_, fail } from '../core'

export function orElseOptional<R, E, A, R1, E1, B>(
  ma: Managed<R, O.Option<E>, A>,
  that: () => Managed<R1, O.Option<E1>, B>
): Managed<R & R1, O.Option<E | E1>, A | B> {
  return catchAll_(
    ma,
    O.fold(
      () => that(),
      (e) => fail(O.some<E | E1>(e))
    )
  )
}
