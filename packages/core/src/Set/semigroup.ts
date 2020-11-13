import type { Eq } from "@principia/prelude/Eq";
import type { Semigroup } from "@principia/prelude/Semigroup";
import { fromCombine } from "@principia/prelude/Semigroup";

import { intersection_ } from "./combinators";

/*
 * -------------------------------------------
 * Semigroup Set
 * -------------------------------------------
 */

export function getIntersectionSemigroup<A>(E: Eq<A>): Semigroup<ReadonlySet<A>> {
   const intersectionE_ = intersection_(E);
   return fromCombine((x, y) => intersectionE_(x, y));
}
