import type { HasClock } from '../../Clock'
import type { Schedule } from '../../Schedule'
import type { IO } from '../core'
import type { Either } from '@principia/base/data/Either'
import type { Option } from '@principia/base/data/Option'

import * as E from '@principia/base/data/Either'
import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as S from '../../Schedule'
import { flatMap, foldM, map } from '../core'
import { orDie } from './orDie'

/**
 * ```haskell
 * repeatOrElseEither_ :: (
 *    IO r e a,
 *    Schedule r1 a b,
 *    ((e, Option b) -> IO r2 e2 c)
 * ) -> IO (r & r1 & r2 & HasClock) e2 (Either c b)
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
export function repeatOrElseEither_<R, R1, R2, E, E2, A, B, C>(
  fa: IO<R, E, A>,
  sc: Schedule<R1, A, B>,
  f: (_: E, __: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & HasClock, E2, Either<C, B>> {
  return pipe(
    S.driver(sc),
    flatMap((driver) => {
      function loop(a: A): IO<R & R1 & R2 & HasClock, E2, Either<C, B>> {
        return pipe(
          driver.next(a),
          foldM(
            () => pipe(orDie(driver.last), map(E.right)),
            (b) =>
              pipe(
                fa,
                foldM(
                  (e) => pipe(f(e, O.some(b)), map(E.left)),
                  (a) => loop(a)
                )
              )
          )
        )
      }
      return pipe(
        fa,
        foldM(
          (e) => pipe(f(e, O.none()), map(E.left)),
          (a) => loop(a)
        )
      )
    })
  )
}
