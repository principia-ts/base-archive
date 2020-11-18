import type { Bounded } from "@principia/prelude/Bounded";

import { identity } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Bounded Const
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getBounded<E, A>(B: Bounded<E>): Bounded<Const<E, A>> {
  return identity(B) as any;
}
