import type { Ord } from "@principia/prelude/Ord";

import { identity } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Ord Const
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getOrd: <E, A>(O: Ord<E>) => Ord<Const<E, A>> = identity;
