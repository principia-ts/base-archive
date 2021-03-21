import type { Clock } from '../../Clock'
import type { IO } from '../core'
import type { Has } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'

import * as S from '../../Schedule'
import { bind, fail, map, map_, matchM, orDie } from '../core'

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeat_<R, SR, E, A, B>(ef: IO<R, E, A>, sc: S.Schedule<SR, A, B>): IO<R & SR & Has<Clock>, E, B> {
  return repeatOrElse_(ef, sc, (e) => fail(e))
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeat<SR, A, B>(sc: S.Schedule<SR, A, B>) {
  return <R, E>(ef: IO<R, E, A>) => repeat_(ef, sc)
}

/**
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
export function repeatOrElse_<R, E, A, R1, B, R2, E2, C>(
  ma: IO<R, E, A>,
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & Has<Clock>, E2, C | B> {
  return map_(repeatOrElseEither_(ma, sc, f), E.merge)
}

/**
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
export function repeatOrElse<E, A, R1, B, R2, E2, C>(
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2 & Has<Clock>, E2, B | C> {
  return (ma) => repeatOrElse_(ma, sc, f)
}

/**
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
export function repeatOrElseEither_<R, E, A, R1, B, R2, E2, C>(
  fa: IO<R, E, A>,
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  return pipe(
    S.driver(sc),
    bind((driver) => {
      function loop(a: A): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
        return pipe(
          driver.next(a),
          matchM(
            () => pipe(orDie(driver.last), map(E.Right)),
            (b) =>
              pipe(
                fa,
                matchM(
                  (e) => pipe(f(e, O.Some(b)), map(E.Left)),
                  (a) => loop(a)
                )
              )
          )
        )
      }
      return pipe(
        fa,
        matchM(
          (e) => pipe(f(e, O.None()), map(E.Left)),
          (a) => loop(a)
        )
      )
    })
  )
}

/**
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
export function repeatOrElseEither<E, A, R1, B, R2, E2, C>(
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  return (ma) => repeatOrElseEither_(ma, sc, f)
}
