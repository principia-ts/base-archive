import type { Ring } from "@principia/prelude/Ring";

import { identity } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Ring Const
 * -------------------------------------------
 */

/**
 * @category Ring
 * @since 1.0.0
 */
export const getRing: <E, A>(S: Ring<E>) => Ring<Const<E, A>> = identity as any;
