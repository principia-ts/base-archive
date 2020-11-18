import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Alt } from "./alt";
import { Applicative } from "./applicative";
import { empty } from "./constructors";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Alternative Array
 * -------------------------------------------
 */

export const Alterenative: P.Alternative<[URI], V> = HKT.instance({
  ...Applicative,
  ...Alt,
  empty
});
