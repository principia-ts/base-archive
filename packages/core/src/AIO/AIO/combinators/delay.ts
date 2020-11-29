import type { HasClock } from "../../Clock";
import { sleep } from "../../Clock";
import { chain_ } from "../_core";
import type { AIO } from "../model";

/**
 * ```haskell
 * _delay :: (AIO r e a, Number) -> AIO (r & HasClock) e a
 * ```
 *
 * Delays an `AIO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export function delay_<R, E, A>(ef: AIO<R, E, A>, ms: number): AIO<R & HasClock, E, A> {
  return chain_(sleep(ms), () => ef);
}

/**
 * ```haskell
 * delay :: Number -> AIO r e a -> AIO (r & HasClock) e a
 * ```
 *
 * Delays an `AIO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 */
export function delay(ms: number): <R, E, A>(ef: AIO<R, E, A>) => AIO<R & HasClock, E, A> {
  return (ef) => delay_(ef, ms);
}
