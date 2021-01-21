import type { Clock } from '../../Clock'
import type { IO } from '../core'
import type { Has } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import * as S from '../../Schedule'
import { chain, foldM, map, map_, orDie } from '../core'

/**
 * ```haskell
 * repeat_ :: (IO r e a, Schedule sr a b) -> IO (r & sr & Has<Clock>) e b
 * ```
 *
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
 * ```haskell
 * repeat :: Schedule sr e a -> IO r e a -> IO (r & sr & Has<Clock>) e b
 * ```
 *
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
 * ```haskell
 * repeatOrElse_ :: (IO r e a, Schedule r1 a b, ((e, Option b) -> IO r2 e2 c))
 *               -> IO (r & s1 & r2 & Has<Clock>) e2 (c | b)
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
export function repeatOrElse_<R, E, A, R1, B, R2, E2, C>(
  ma: IO<R, E, A>,
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & Has<Clock>, E2, C | B> {
  return map_(repeatOrElseEither_(ma, sc, f), E.merge)
}

/**
 * ```haskell
 * repeatOrElse_ :: (Schedule r1 a b, ((e, Option b) -> IO r2 e2 c))
 *               -> IO r e a
 *               -> IO (r & s1 & r2 & Has<Clock>) e2 (c | b)
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
export function repeatOrElse<E, A, R1, B, R2, E2, C>(
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2 & Has<Clock>, E2, B | C> {
  return (ma) => repeatOrElse_(ma, sc, f)
}

/**
 * ```haskell
 * repeatOrElseEither_ :: (IO r e a, Schedule r1 a b, ((e, Option b) -> IO r2 e2 c))
 *                     -> IO (r & r1 & r2 & Has<Clock>) e2 (Either c b)
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
export function repeatOrElseEither_<R, E, A, R1, B, R2, E2, C>(
  fa: IO<R, E, A>,
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  return pipe(
    S.driver(sc),
    chain((driver) => {
      function loop(a: A): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
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

/**
 * ```haskell
 * repeatOrElseEither :: (Schedule r1 a b, ((e, Option b) -> IO r2 e2 c))
 *                    -> IO r e a
 *                    -> IO (r & r1 & r2 & Has<Clock>) e2 (Either c b)
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
export function repeatOrElseEither<E, A, R1, B, R2, E2, C>(
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  return (ma) => repeatOrElseEither_(ma, sc, f)
}
