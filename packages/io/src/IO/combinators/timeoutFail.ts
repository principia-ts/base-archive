import type { HasClock } from '../../Clock'
import type { IO } from '../core'

import { effectSuspendTotal, fail, flatten, pure } from '../core'
import { timeoutTo_ } from './timeoutTo'

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 */
export function timeoutFail_<R, E, A, E1>(ma: IO<R, E, A>, d: number, e: () => E1): IO<R & HasClock, E | E1, A> {
  return flatten(
    timeoutTo_(
      ma,
      d,
      effectSuspendTotal(() => fail(e())),
      pure
    )
  )
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 */
export function timeoutFail<E1>(d: number, e: () => E1) {
  return <R, E, A>(ma: IO<R, E, A>) => timeoutFail_(ma, d, e)
}
