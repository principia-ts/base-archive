import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { fail } from "./constructors";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Fail EIO
 * -------------------------------------------
 */

export const Fail: P.Fail<[URI], V> = HKT.instance({
  fail
});
