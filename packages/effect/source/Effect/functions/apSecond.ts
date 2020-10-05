import type * as TC from "@principia/core/typeclass-index";

import * as T from "../core";
import type { Effect, URI, V } from "../Effect";

/**
 * ```haskell
 * _apSecond :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const _apSecond: TC.UC_ApSecondF<[URI], V> = <R, E, A, R1, E1, B>(
   fa: Effect<R, E, A>,
   fb: Effect<R1, E1, B>
): Effect<R & R1, E | E1, B> =>
   T._ap(
      T._map(fa, () => (b: B) => b),
      fb
   );

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);
