import type { Clock } from '../../Clock'
import type { Schedule } from '../../Schedule'
import type { ReleaseMap } from '../ReleaseMap'
import type { Has } from '@principia/prelude/Has'

import { pipe } from '@principia/prelude/function'
import { tuple } from '@principia/prelude/tuple'

import { Managed } from '../core'
import * as I from '../internal/_io'

export function retry_<R, E, A, R1, O>(
  ma: Managed<R, E, A>,
  policy: Schedule<R1, E, O>
): Managed<R & R1 & Has<Clock>, E, A> {
  return new Managed(
    I.asksM(([env, releaseMap]: readonly [R & R1 & Has<Clock>, ReleaseMap]) =>
      pipe(
        ma.io,
        I.gives((_: R & R1 & Has<Clock>) => tuple(_, releaseMap)),
        I.retry(policy),
        I.giveAll(env)
      )
    )
  )
}

export function retry<R1, E, O>(
  policy: Schedule<R1, E, O>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1 & Has<Clock>, E, A> {
  return (ma) => retry_(ma, policy)
}
