import type { Either } from "../../Either";
import * as E from "../../Either";
import { pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain, chain_, foldM, map, map_, pure } from "../_core";
import type { HasClock } from "../Clock";
import type { IO } from "../model";
import type { Schedule } from "../Schedule";
import * as S from "../Schedule";
import { orDie } from "./orDie";

/**
 * ```haskell
 * repeatN_ :: (IO r e a, Number) -> IO r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN_<R, E, A>(ef: IO<R, E, A>, n: number): IO<R, E, A> {
  return chain_(ef, (a) => (n <= 0 ? pure(a) : repeatN_(ef, n - 1)));
}

/**
 * ```haskell
 * repeatN :: Number -> IO r e a -> IO r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN(n: number): <R, E, A>(ef: IO<R, E, A>) => IO<R, E, A> {
  return (ef) => repeatN_(ef, n);
}

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
    chain((driver) => {
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
        );
      }
      return pipe(
        fa,
        foldM(
          (e) => pipe(f(e, O.none()), map(E.left)),
          (a) => loop(a)
        )
      );
    })
  );
}

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
  return map_(repeatOrElseEither_(ef, sc, f), E.merge);
}

/**
 * ```haskell
 * repeat_ :: (IO r e a, Schedule sr a b) -> IO (r & sr & HasClock) e b
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
export function repeat_<R, SR, E, A, B>(
  ef: IO<R, E, A>,
  sc: S.Schedule<SR, A, B>
): IO<R & SR & HasClock, E, B> {
  return repeatOrElse_(ef, sc, (e) => fail(e));
}

/**
 * ```haskell
 * repeat :: Schedule sr e a -> IO r e a -> IO (r & sr & HasClock) e b
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
  return <R, E>(ef: IO<R, E, A>) => repeat_(ef, sc);
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<R, E, A, R1, E1>(
  ef: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return chain_(ef, (a) => chain_(f(a), (b) => (b ? pure(a) : repeatUntilM_(ef, f))));
}

/**
 * Repeats this effect until its result satisfies the specified effectful predicate.
 */
export function repeatUntilM<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ef) => repeatUntilM_(ef, f);
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil_<R, E, A>(ef: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatUntilM_(ef, (a) => pure(f(a)));
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil<A>(f: (a: A) => boolean): <R, E>(ef: IO<R, E, A>) => IO<R, E, A> {
  return (ef) => repeatUntil_(ef, f);
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM_<R, E, A, R1, E1>(
  ef: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return chain_(ef, (a) => chain_(f(a), (b) => (b ? repeatWhileM_(ef, f) : pure(a))));
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ef) => repeatWhileM_(ef, f);
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile_<R, E, A>(ef: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatWhileM_(ef, (a) => pure(f(a)));
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile<A>(f: (a: A) => boolean): <R, E>(ef: IO<R, E, A>) => IO<R, E, A> {
  return (ef) => repeatWhile_(ef, f);
}
