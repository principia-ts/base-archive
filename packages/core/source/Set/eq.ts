import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { isSubset } from "./guards";

/*
 * -------------------------------------------
 * Eq Set
 * -------------------------------------------
 */

export const getEq = <A>(E: Eq<A>): Eq<ReadonlySet<A>> => {
   const subsetE = isSubset(E);
   return fromEquals((x, y) => subsetE(x)(y) && subsetE(y)(x));
};
