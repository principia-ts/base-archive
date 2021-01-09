import type { HasClock } from '../../Clock'
import type { Driver,Schedule } from '../../Schedule'
import type { IO } from '../core'
import type { Either } from '@principia/base/Either'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'

import * as S from '../../Schedule'
import { catchAll, flatMap, foldM, map, orDie } from '../core'

const _loop = <R, E, A, R1, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>,
  driver: Driver<R1 & HasClock, E, O>
): IO<R & R1 & R2 & HasClock, E2, Either<A2, A>> =>
    pipe(
      fa,
      map(E.right),
      catchAll((e) =>
        pipe(
          driver.next(e),
          foldM(
            () =>
              pipe(
                driver.last,
                orDie,
                flatMap((o) => pipe(orElse(e, o), map(E.left)))
              ),
            () => _loop(fa, orElse, driver)
          )
        )
      )
    )

/**
 * Returns an IO that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither_<R, E, A, R1, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
): IO<R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return pipe(
    policy,
    S.driver,
    flatMap((a) => _loop(fa, orElse, a))
  )
}

/**
 * Returns an IO that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither<E, R1, O, R2, E2, A2>(
  policy: S.Schedule<R1, E, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
) {
  return <R, A>(fa: IO<R, E, A>) => retryOrElseEither_(fa, policy, orElse)
}
