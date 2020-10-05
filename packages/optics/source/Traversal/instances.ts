import * as HKT from "@principia/core/HKT";
import type * as TC from "@principia/core/typeclass-index";

import { id } from "./constructors";
import { compose } from "./methods";
import { URI, V } from "./Traversal";

/*
 * -------------------------------------------
 * Traversal Typeclass Instances
 * -------------------------------------------
 */

export const Category: TC.Category<[URI], V> = HKT.instance({
   compose,
   id
});
