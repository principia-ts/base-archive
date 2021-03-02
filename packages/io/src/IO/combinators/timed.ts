import type { IO } from '../core'
import type { Has } from '@principia/base/Has'

import { Clock } from '../../Clock'
import { timedWith_ } from '../core'

/**
 * Returns a new effect that executes this one and times the execution.
 */
export function timed<R, E, A>(ma: IO<R, E, A>): IO<R & Has<Clock>, E, readonly [number, A]> {
  return timedWith_(ma, Clock.currentTime)
}
