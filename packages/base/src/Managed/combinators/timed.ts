import type { Clock } from '../../Clock'
import type * as RM from '../ReleaseMap'
import type { Has } from '@principia/prelude/Has'

import { ClockTag } from '../../Clock'
import { pipe } from '../../function'
import { asksServiceManaged, Managed } from '../core'
import * as I from '../internal/_io'

export function timed<R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, readonly [number, A]> {
  return asksServiceManaged(ClockTag)(
    (clock) =>
      new Managed(
        I.asksM(([r, releaseMap]: readonly [R, RM.ReleaseMap]) =>
          pipe(
            ma.io,
            I.giveAll([r, releaseMap] as const),
            I.timed,
            I.map(([duration, [fin, a]]) => [fin, [duration, a]] as const),
            I.giveService(ClockTag)(clock)
          )
        )
      )
  )
}
