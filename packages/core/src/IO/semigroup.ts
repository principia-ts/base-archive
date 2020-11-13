import type { Semigroup } from "@principia/prelude/Semigroup";
import { fromCombine } from "@principia/prelude/Semigroup";

import { mapBoth_ } from "./apply";
import type { IO } from "./model";

/*
 * -------------------------------------------
 * Semigroup IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: Semigroup s => s a -> s (IO a)
 * ```
 *
 * Lifts a `Semigroup` into `IO`, the inner values are concatenated with the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<A>(S: Semigroup<A>): Semigroup<IO<A>> {
   return fromCombine((x, y) => mapBoth_(x, y, (x_, y_) => S.combine_(x_, y_)));
}
