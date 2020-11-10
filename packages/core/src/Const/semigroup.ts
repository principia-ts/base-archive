import type { Semigroup } from "@principia/prelude/Semigroup";

import { identity } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Semigroup Const
 * -------------------------------------------
 */

/**
 * @category Semigroup
 * @since 1.0.0
 */
export const getSemigroup: <E, A>(S: Semigroup<E>) => Semigroup<Const<E, A>> = identity as any;
