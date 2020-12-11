import { fail } from "../_core";
import type { HasClock } from "../Clock";
import type { IO } from "../model";
import type * as S from "../Schedule";
import { retryOrElse_ } from "./retryOrElse";

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
