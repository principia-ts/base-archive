import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { id } from "./constructors";
import { compose } from "./methods";
import type { URI, V } from "./Traversal";

/*
 * -------------------------------------------
 * Traversal Typeclass Instances
 * -------------------------------------------
 */

export const Category: TC.Category<[URI], V> = HKT.instance({
   compose,
   compose_: (ab, bc) => compose(bc)(ab),
   id
});
