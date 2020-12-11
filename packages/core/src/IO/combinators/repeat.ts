import { chain_, pure } from "../_core";
import type { HasClock } from "../Clock";
import type { IO } from "../model";
import type * as S from "../Schedule";
import { repeatOrElse_ } from "./repeatOrElse";

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
