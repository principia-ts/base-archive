import type { IO } from '../core'

import { currentTime } from '../../Clock'
import { timedWith_ } from './timedWith'

/**
 * Returns a new effect that executes this one and times the execution.
 */
export function timed<R, E, A>(ma: IO<R, E, A>) {
  return timedWith_(ma, currentTime)
}
