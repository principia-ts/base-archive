import type * as I from '../../IO'
import type { Stream } from '../core'

import { flatten, fromEffect } from '../core'

export function unwrap<R, E, O>(fa: I.IO<R, E, Stream<R, E, O>>): Stream<R, E, O> {
  return flatten(fromEffect(fa))
}
