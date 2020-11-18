import type { Semigroup } from "@principia/prelude/Semigroup";
import { fromCombine } from "@principia/prelude/Semigroup";

import type { LazyPromise } from "./model";

/*
 * -------------------------------------------
 * Semigroup LazyPromise
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: Semigroup s => s a -> s (LazyPromise a)
 * ```
 *
 * Lift a `Semigroup` into 'LazyPromise', the inner values are concatenated using the provided `Semigroup`.
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <A>(S: Semigroup<A>): Semigroup<LazyPromise<A>> =>
  fromCombine((x, y) => () => x().then((rx) => y().then((ry) => S.combine_(rx, ry))));
