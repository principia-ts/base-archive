import { pipe } from "../../Function";
import { as, map } from "../_core";
import type { HasClock } from "../Clock";
import { sleep } from "../Clock";
import type { IO } from "../model";
import { makeInterruptible } from "./interrupt";
import { raceFirst } from "./raceFirst";

/**
 * Returns an IO that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value; and or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted
 */
export function timeoutTo_<R, E, A, B, B1>(
  ma: IO<R, E, A>,
  d: number,
  b: B,
  f: (a: A) => B1
): IO<R & HasClock, E, B | B1> {
  return pipe(
    ma,
    map(f),
    raceFirst(
      pipe(
        sleep(d),
        makeInterruptible,
        as(() => b)
      )
    )
  );
}

/**
 * Returns an IO that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value; and or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted
 */
export function timeoutTo<A, B, B1>(d: number, b: B, f: (a: A) => B1) {
  return <R, E>(ma: IO<R, E, A>) => timeoutTo_(ma, d, b, f);
}
