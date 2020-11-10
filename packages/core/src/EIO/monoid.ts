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
export const getApplyMonoid = <E, A>(M: P.Monoid<A>): P.Monoid<EIO<E, A>> => ({
   ...getApplySemigroup(M),
   nat: succeed(M.nat)
});
