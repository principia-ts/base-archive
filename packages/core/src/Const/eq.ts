import type { Eq } from "@principia/prelude/Eq";

import { identity } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Eq Const
 * -------------------------------------------
 */

/**
 * @category Eq
 * @since 1.0.0
 */
export const getEq: <E, A>(E: Eq<E>) => Eq<Const<E, A>> = identity;
