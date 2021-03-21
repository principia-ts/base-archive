import type { Clock } from '../../Clock'
import type { IO } from '../core'
import type { Has } from '@principia/base/Has'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'

import * as S from '../../Schedule'
import { bind, catchAll, fail, map, map_, matchM, orDie } from '../core'

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry_<R, E extends I, A, R1, I, O>(
  fa: IO<R, E, A>,
  policy: S.Schedule<R1, I, O>
): IO<R & R1 & Has<Clock>, E, A> {
  return retryOrElse_(fa, policy, (e, _) => fail(e))
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry<R1, I, O>(
  policy: S.Schedule<R1, I, O>
): <R, E extends I, A>(fa: IO<R, E, A>) => IO<R & R1 & Has<Clock>, E, A> {
  return (fa) => retry_(fa, policy)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<R, E extends I, A, R1, I, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  policy: S.Schedule<R1, I, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
): IO<R & R1 & R2 & Has<Clock>, E2, A | A2> {
  return map_(retryOrElseEither_(fa, policy, orElse), E.merge)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse<E extends I, R1, I, O, R2, E2, A2>(
  policy: S.Schedule<R1, I, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
) {
  return <R, A>(fa: IO<R, E, A>) => retryOrElse_(fa, policy, orElse)
}

const _loop = <R, E extends I, A, R1, I, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>,
  driver: S.Driver<R1 & Has<Clock>, I, O>
): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<A2, A>> =>
  pipe(
    fa,
    map(E.Right),
    catchAll((e) =>
      pipe(
        driver.next(e),
        matchM(
          () =>
            pipe(
              driver.last,
              orDie,
              bind((o) => pipe(orElse(e, o), map(E.Left)))
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
export function retryOrElseEither_<R, E extends I, A, R1, I, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  policy: S.Schedule<R1, I, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<A2, A>> {
  return pipe(
    policy,
    S.driver,
    bind((a) => _loop(fa, orElse, a))
  )
}

/**
 * Returns an IO that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither<E extends I, R1, I, O, R2, E2, A2>(
  policy: S.Schedule<R1, I, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
) {
  return <R, A>(fa: IO<R, E, A>) => retryOrElseEither_(fa, policy, orElse)
}
