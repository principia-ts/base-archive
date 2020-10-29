import type { Monoid } from "@principia/prelude/Monoid";

import { pure } from "./applicative";
import type { IO } from "./model";
import { getSemigroup } from "./semigroup";

/*
 * -------------------------------------------
 * Monoid IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * getMonoid :: Monoid m => m a -> m (IO a)
 * ```
 *
 * Lifts a `Monoid` into `IO`, the inner values are concatenated with the provided `Monoid`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getMonoid = <A>(M: Monoid<A>): Monoid<IO<A>> => ({
   ...getSemigroup(M),
   nat: pure(M.nat)
});
