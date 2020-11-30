import type { Either } from "../../Either";
import * as E from "../../Either";
import { flow, identity, pipe } from "../../Function";
import { catchAll, catchAll_, chain, chain_, fail, foldM, map, map_, pure } from "../_core";
import type { HasClock } from "../Clock";
import type { IO } from "../model";
import type { Schedule, ScheduleExecutor } from "../Schedule";
import * as S from "../Schedule";
import { orDie } from "./orDie";

const _loop = <R, E, A, R1, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>,
  driver: ScheduleExecutor<R1 & HasClock, E, O>
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
              chain((o) => pipe(orElse(e, o), map(E.left)))
            ),
          () => _loop(fa, orElse, driver)
        )
      )
    )
  );

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
    chain((a) => _loop(fa, orElse, a))
  );
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
  return <R, A>(fa: IO<R, E, A>) => retryOrElseEither_(fa, policy, orElse);
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<R, E, A, R1, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  policy: S.Schedule<R1, E, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
): IO<R & R1 & R2 & HasClock, E2, A | A2> {
  return map_(retryOrElseEither_(fa, policy, orElse), E.fold(identity, identity));
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse<E, R1, O, R2, E2, A2>(
  policy: S.Schedule<R1, E, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
) {
  return <R, A>(fa: IO<R, E, A>) => retryOrElse_(fa, policy, orElse);
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry_<R, E, A, R1, O>(
  fa: IO<R, E, A>,
  policy: S.Schedule<R1, E, O>
): IO<R & R1 & HasClock, E, A> {
  return retryOrElse_(fa, policy, (e, _) => fail(e));
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry<R1, E, O>(policy: S.Schedule<R1, E, O>) {
  return <R, A>(fa: IO<R, E, A>): IO<R & R1 & HasClock, E, A> => retry_(fa, policy);
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(fa, (e) => chain_(f(e), (b) => (b ? fail(e) : retryUntilM_(fa, f))));
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryUntilM_(fa, f);
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export function retryUntil_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean): IO<R, E, A> {
  return retryUntilM_(fa, flow(f, pure));
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntil<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryUntil_(fa, f);
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(fa, (e) => chain_(f(e), (b) => (b ? retryWhileM_(fa, f) : fail(e))));
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryWhileM_(fa, f);
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean) {
  return retryWhileM_(fa, flow(f, pure));
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryWhile_(fa, f);
}
