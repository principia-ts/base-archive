import type { IO } from '../core'
import type { Has } from '@principia/base/Has'

import { Clock } from '../../Clock'
import { bind_ } from '../core'

/**
 * Delays an `IO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export function delay_<R, E, A>(ma: IO<R, E, A>, ms: number): IO<R & Has<Clock>, E, A> {
  return bind_(Clock.sleep(ms), () => ma)
}

/**
 * Delays an `IO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export function delay(ms: number): <R, E, A>(ma: IO<R, E, A>) => IO<R & Has<Clock>, E, A> {
  return (ef) => delay_(ef, ms)
}
