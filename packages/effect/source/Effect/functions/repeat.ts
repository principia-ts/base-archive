import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import type { HasClock } from "../../Clock";
import type { Schedule } from "../../Schedule";
import * as S from "../../Schedule";
import { chain, chain_, foldM, map, map_, pure } from "../core";
import type { Effect } from "../Effect";
import { orDie } from "./orDie";

/**
 * ```haskell
 * repeatN_ :: (Effect r e a, Number) -> Effect r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const repeatN_ = <R, E, A>(ef: Effect<R, E, A>, n: number): Effect<R, E, A> =>
   chain_(ef, (a) => (n <= 0 ? pure(a) : repeatN_(ef, n - 1)));

/**
 * ```haskell
 * repeatN :: Number -> Effect r e a -> Effect r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const repeatN = (n: number) => <R, E, A>(ef: Effect<R, E, A>) => repeatN_(ef, n);

/**
 * ```haskell
 * repeatOrElseEither_ :: (
 *    Effect r e a,
 *    Schedule r1 a b,
 *    ((e, Maybe b) -> Effect r2 e2 c)
 * ) -> Effect (r & r1 & r2 & HasClock) e2 (Either c b)
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const repeatOrElseEither_ = <R, R1, R2, E, E2, A, B, C>(
   fa: Effect<R, E, A>,
   sc: Schedule<R1, A, B>,
   f: (_: E, __: Option<B>) => Effect<R2, E2, C>
): Effect<R & R1 & R2 & HasClock, E2, Either<C, B>> =>
   pipe(
      S.driver(sc),
      chain((driver) => {
         function loop(a: A): Effect<R & R1 & R2 & HasClock, E2, Either<C, B>> {
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

/**
 * ```haskell
 * repeatOrElse_ :: (Effect r e a, Schedule sr a b, ((e, Maybe b) -> Effect r1 e1 c)) ->
 *    Effect (r & sr & r1 & HasClock) e1 (c | b)
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const repeatOrElse_ = <R, SR, R1, E, E1, A, B, C>(
   ef: Effect<R, E, A>,
   sc: S.Schedule<SR, A, B>,
   f: (_: E, __: Option<B>) => Effect<R1, E1, C>
): Effect<R & SR & R1 & HasClock, E1, C | B> => map_(repeatOrElseEither_(ef, sc, f), E.merge);

/**
 * ```haskell
 * repeat_ :: (Effect r e a, Schedule sr a b) -> Effect (r & sr & HasClock) e b
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
export const repeat_ = <R, SR, E, A, B>(
   ef: Effect<R, E, A>,
   sc: S.Schedule<SR, A, B>
): Effect<R & SR & HasClock, E, B> => repeatOrElse_(ef, sc, (e) => fail(e));

/**
 * ```haskell
 * repeat :: Schedule sr e a -> Effect r e a -> Effect (r & sr & HasClock) e b
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
export const repeat = <SR, A, B>(sc: S.Schedule<SR, A, B>) => <R, E>(ef: Effect<R, E, A>) => repeat_(ef, sc);

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export const repeatUntilM_ = <R, E, A, R1, E1>(
   ef: Effect<R, E, A>,
   f: (a: A) => Effect<R1, E1, boolean>
): Effect<R & R1, E | E1, A> => chain_(ef, (a) => chain_(f(a), (b) => (b ? pure(a) : repeatUntilM_(ef, f))));

/**
 * Repeats this effect until its result satisfies the specified effectful predicate.
 */
export const repeatUntilM = <A, R1, E1>(f: (a: A) => Effect<R1, E1, boolean>) => <R, E>(ef: Effect<R, E, A>) =>
   repeatUntilM_(ef, f);

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export const repeatUntil_ = <R, E, A>(ef: Effect<R, E, A>, f: (a: A) => boolean) =>
   repeatUntilM_(ef, (a) => pure(f(a)));

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export const repeatUntil = <A>(f: (a: A) => boolean) => <R, E>(ef: Effect<R, E, A>) => repeatUntil_(ef, f);

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export const repeatWhileM_ = <R, E, A, R1, E1>(
   ef: Effect<R, E, A>,
   f: (a: A) => Effect<R1, E1, boolean>
): Effect<R & R1, E | E1, A> => chain_(ef, (a) => chain_(f(a), (b) => (b ? repeatWhileM_(ef, f) : pure(a))));

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export const repeatWhileM = <A, R1, E1>(f: (a: A) => Effect<R1, E1, boolean>) => <R, E>(ef: Effect<R, E, A>) =>
   repeatWhileM_(ef, f);

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export const repeatWhile_ = <R, E, A>(ef: Effect<R, E, A>, f: (a: A) => boolean) =>
   repeatWhileM_(ef, (a) => pure(f(a)));

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export const repeatWhile = <A>(f: (a: A) => boolean) => <R, E>(ef: Effect<R, E, A>) => repeatWhile_(ef, f);
