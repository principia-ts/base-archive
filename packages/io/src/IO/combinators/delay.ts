import type { Clock } from '../../Clock'
import type { IO } from '../core'
import type { Has } from '@principia/base/Has'

import { sleep } from '../../Clock'
import { bind_ } from '../core'

/**
 * ```haskell
 * delay_ :: (IO r e a, Number) -> IO (r & Has<Clock>) e a
 * ```
 *
 * Delays an `IO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export function delay_<R, E, A>(ma: IO<R, E, A>, ms: number): IO<R & Has<Clock>, E, A> {
  return bind_(sleep(ms), () => ma)
}

/**
 * ```haskell
 * delay :: Number -> IO r e a -> IO (r & Has<Clock>) e a
 * ```
 *
 * Delays an `IO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export function delay(ms: number): <R, E, A>(ma: IO<R, E, A>) => IO<R & Has<Clock>, E, A> {
  return (ef) => delay_(ef, ms)
}
