import type * as P from "@principia/prelude";

import { right } from "./constructors";
import type { Either } from "./model";
import { getApplySemigroup } from "./semigroup";

/*
 * -------------------------------------------
 * Monoid Either
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplyMonoid<E, A>(M: P.Monoid<A>): P.Monoid<Either<E, A>> {
   return {
      ...getApplySemigroup<E, A>(M),
      nat: right(M.nat)
   };
}
