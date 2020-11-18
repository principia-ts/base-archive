import type * as P from "@principia/prelude";

import { succeed } from "./constructors";
import type { EIO } from "./model";
import { getApplySemigroup } from "./semigroup";

/*
 * -------------------------------------------
 * Monoid EIO
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplyMonoid<E, A>(M: P.Monoid<A>): P.Monoid<EIO<E, A>> {
  return {
    ...getApplySemigroup(M),
    nat: succeed(M.nat)
  };
}
