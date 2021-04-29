import type { Has } from '../../Has'
import type { IO } from '../core'

import { Clock } from '../../Clock'

export function sleep(ms: number): IO<Has<Clock>, never, void> {
  return Clock.sleep(ms)
}
