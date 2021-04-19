import type { IO } from '../core'
import type { Has } from '@principia/prelude/Has'

import { Clock } from '../../Clock'

export function sleep(ms: number): IO<Has<Clock>, never, void> {
  return Clock.sleep(ms)
}
