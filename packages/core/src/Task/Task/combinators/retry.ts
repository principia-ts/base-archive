import { catchAll, catchAll_, chain, chain_, fail, foldM, map, map_, pure } from "../_core";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { flow, identity, pipe } from "../../../Function";
import type { HasClock } from "../../Clock";
import type { Schedule, ScheduleExecutor } from "../../Schedule";
import * as S from "../../Schedule";
import type { Task } from "../model";
import { orDie } from "./orDie";

const _loop = <R, E, A, R1, O, R2, E2, A2>(
   fa: Task<R, E, A>,
   orElse: (e: E, o: O) => Task<R2, E2, A2>,
   driver: ScheduleExecutor<R1 & HasClock, E, O>
): Task<R & R1 & R2 & HasClock, E2, Either<A2, A>> =>
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
                     chain((o) => pipe(orElse(e, o), map(E.left)))
                  ),
               () => _loop(fa, orElse, driver)
            )
         )
      )
   );

/**
 * Returns a task that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export const retryOrElseEither_ = <R, E, A, R1, O, R2, E2, A2>(
   fa: Task<R, E, A>,
   policy: Schedule<R1, E, O>,
   orElse: (e: E, o: O) => Task<R2, E2, A2>
): Task<R & R1 & R2 & HasClock, E2, E.Either<A2, A>> =>
   pipe(
      policy,
      S.driver,
      chain((a) => _loop(fa, orElse, a))
   );

/**
 * Returns a task that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export const retryOrElseEither = <E, R1, O, R2, E2, A2>(
   policy: S.Schedule<R1, E, O>,
   orElse: (e: E, o: O) => Task<R2, E2, A2>
) => <R, A>(fa: Task<R, E, A>) => retryOrElseEither_(fa, policy, orElse);

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export const retryOrElse_ = <R, E, A, R1, O, R2, E2, A2>(
   fa: Task<R, E, A>,
   policy: S.Schedule<R1, E, O>,
   orElse: (e: E, o: O) => Task<R2, E2, A2>
): Task<R & R1 & R2 & HasClock, E2, A | A2> => map_(retryOrElseEither_(fa, policy, orElse), E.fold(identity, identity));

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export const retryOrElse = <E, R1, O, R2, E2, A2>(
   policy: S.Schedule<R1, E, O>,
   orElse: (e: E, o: O) => Task<R2, E2, A2>
) => <R, A>(fa: Task<R, E, A>) => retryOrElse_(fa, policy, orElse);

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export const retry_ = <R, E, A, R1, O>(
   fa: Task<R, E, A>,
   policy: S.Schedule<R1, E, O>
): Task<R & R1 & HasClock, E, A> => retryOrElse_(fa, policy, (e, _) => fail(e));

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export const retry = <R1, E, O>(policy: S.Schedule<R1, E, O>) => <R, A>(
   fa: Task<R, E, A>
): Task<R & R1 & HasClock, E, A> => retry_(fa, policy);

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export const retryUntilM_ = <R, E, A, R1, E1>(
   fa: Task<R, E, A>,
   f: (e: E) => Task<R1, E1, boolean>
): Task<R & R1, E | E1, A> => catchAll_(fa, (e) => chain_(f(e), (b) => (b ? fail(e) : retryUntilM_(fa, f))));

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export const retryUntilM = <E, R1, E1>(f: (e: E) => Task<R1, E1, boolean>) => <R, A>(
   fa: Task<R, E, A>
): Task<R & R1, E | E1, A> => retryUntilM_(fa, f);

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export const retryUntil_ = <R, E, A>(fa: Task<R, E, A>, f: (e: E) => boolean) => retryUntilM_(fa, flow(f, pure));

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export const retryUntil = <E>(f: (e: E) => boolean) => <R, A>(fa: Task<R, E, A>) => retryUntil_(fa, f);

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export const retryWhileM_ = <R, E, A, R1, E1>(
   fa: Task<R, E, A>,
   f: (e: E) => Task<R1, E1, boolean>
): Task<R & R1, E | E1, A> => catchAll_(fa, (e) => chain_(f(e), (b) => (b ? retryWhileM_(fa, f) : fail(e))));

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export const retryWhileM = <E, R1, E1>(f: (e: E) => Task<R1, E1, boolean>) => <R, A>(fa: Task<R, E, A>) =>
   retryWhileM_(fa, f);

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export const retryWhile_ = <R, E, A>(fa: Task<R, E, A>, f: (e: E) => boolean) => retryWhileM_(fa, flow(f, pure));

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export const retryWhile = <E>(f: (e: E) => boolean) => <R, A>(fa: Task<R, E, A>) => retryWhile_(fa, f);
