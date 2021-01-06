import type { Managed } from '../core'

import { pipe } from '@principia/base/data/Function'

import { ask, flatMap, give_ } from '../core'

export function compose<R, E, A, R1, E1>(ma: Managed<R, E, A>, that: Managed<R1, E1, R>): Managed<R1, E | E1, A> {
  return pipe(
    ask<R1>(),
    flatMap((r1) => give_(that, r1)),
    flatMap((r) => give_(ma, r))
  )
}
