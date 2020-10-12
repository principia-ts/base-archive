import type { HasClock } from "../../Clock";
import { sleep } from "../../Clock";
import { chain_ } from "../core";
import type { Effect } from "../Effect";

/**
 * ```haskell
 * _delay :: (Effect r e a, Number) -> Effect (r & HasClock) e a
 * ```
 *
 * Delays an `Effect` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _delay = <R, E, A>(ef: Effect<R, E, A>, ms: number): Effect<R & HasClock, E, A> =>
   chain_(sleep(ms), () => ef);

/**
 * ```haskell
 * delay :: Number -> Effect r e a -> Effect (r & HasClock) e a
 * ```
 *
 * Delays an `Effect` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export const delay = (ms: number) => <R, E, A>(ef: Effect<R, E, A>): Effect<R & HasClock, E, A> => _delay(ef, ms);
