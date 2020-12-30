import type { IO } from '../core'

import * as I from '../core'

export function onSecond<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [R, A]> {
  return I.product_(I.ask<R>(), io)
}
