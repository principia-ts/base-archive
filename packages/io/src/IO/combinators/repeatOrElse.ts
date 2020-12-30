import type { HasClock } from '../../Clock'
import type * as S from '../../Schedule'
import type { IO } from '../core'
import type { Option } from '@principia/base/data/Option'

import * as E from '@principia/base/data/Either'

import { map_ } from '../core'
import { repeatOrElseEither_ } from './repeatOrElseEither'

/**
 * ```haskell
 * repeatOrElse_ :: (IO r e a, Schedule sr a b, ((e, Option b) -> IO r1 e1 c)) ->
 *    IO (r & sr & r1 & HasClock) e1 (c | b)
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an IO that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatOrElse_<R, SR, R1, E, E1, A, B, C>(
  ef: IO<R, E, A>,
  sc: S.Schedule<SR, A, B>,
  f: (_: E, __: Option<B>) => IO<R1, E1, C>
): IO<R & SR & R1 & HasClock, E1, C | B> {
  return map_(repeatOrElseEither_(ef, sc, f), E.merge)
}
