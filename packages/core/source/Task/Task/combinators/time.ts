import { as, flatten, map, pure, suspend } from "../_core";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import type { HasClock } from "../../Clock";
import { currentTime, sleep } from "../../Clock";
import type { Task } from "../model";
import { makeInterruptible } from "./interrupt";
import { raceFirst } from "./race";
import { summarized_ } from "./summarized";

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export const timedWith_ = <R, E, A, R1, E1>(fa: Task<R, E, A>, msTime: Task<R1, E1, number>) =>
   summarized_(fa, msTime, (start, end) => end - start);

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export const timedWith = <R1, E1>(msTime: Task<R1, E1, number>) => <R, E, A>(ef: Task<R, E, A>) =>
   timedWith_(ef, msTime);

/**
 * Returns a new effect that executes this one and times the execution.
 */
export const timed = <R, E, A>(fa: Task<R, E, A>) => timedWith_(fa, currentTime);

/**
 * Returns a task that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value; and or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted
 */
export const timeoutTo_ = <R, E, A, B, B1>(
   fa: Task<R, E, A>,
   d: number,
   b: B,
   f: (a: A) => B1
): Task<R & HasClock, E, B | B1> => pipe(fa, map(f), raceFirst(pipe(sleep(d), makeInterruptible, as(b))));

/**
 * Returns a task that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value; and or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted
 */
export const timeoutTo = <A, B, B1>(d: number, b: B, f: (a: A) => B1) => <R, E>(fa: Task<R, E, A>) =>
   timeoutTo_(fa, d, b, f);

/**
 * Returns a task that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 */
export const timeout_ = <R, E, A>(fa: Task<R, E, A>, d: number) => timeoutTo_(fa, d, O.none(), O.some);

/**
 * Returns a task that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 */
export const timeout = (d: number) => <R, E, A>(fa: Task<R, E, A>) => timeout_(fa, d);

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 */
export const timeoutFail_ = <R, E, A, E1>(fa: Task<R, E, A>, d: number, e: () => E1): Task<R & HasClock, E | E1, A> =>
   flatten(
      timeoutTo_(
         fa,
         d,
         suspend(() => fail(e())),
         pure
      )
   );

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 */
export const timeoutFail = <E1>(d: number, e: () => E1) => <R, E, A>(fa: Task<R, E, A>) => timeoutFail_(fa, d, e);
