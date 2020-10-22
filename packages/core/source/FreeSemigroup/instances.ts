import type { Semigroup } from "@principia/prelude";
import { fromCombine } from "@principia/prelude/Semigroup";

import { combine } from "./constructors";
import type { FreeSemigroup } from "./model";

/*
 * -------------------------------------------
 * FreeSemigroup Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <A = never>(): Semigroup<FreeSemigroup<A>> => fromCombine(combine);
