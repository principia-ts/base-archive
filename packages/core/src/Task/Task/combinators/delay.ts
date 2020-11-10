import { chain_ } from "../_core";
import type { HasClock } from "../../Clock";
import { sleep } from "../../Clock";
import type { Task } from "../model";

/**
 * ```haskell
 * _delay :: (Task r e a, Number) -> Task (r & HasClock) e a
 * ```
 *
 * Delays an `Task` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _delay = <R, E, A>(ef: Task<R, E, A>, ms: number): Task<R & HasClock, E, A> => chain_(sleep(ms), () => ef);

/**
 * ```haskell
 * delay :: Number -> Task r e a -> Task (r & HasClock) e a
 * ```
 *
 * Delays an `Task` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export const delay = (ms: number) => <R, E, A>(ef: Task<R, E, A>): Task<R & HasClock, E, A> => _delay(ef, ms);
