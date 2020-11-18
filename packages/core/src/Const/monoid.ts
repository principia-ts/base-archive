import type { Monoid } from "@principia/prelude/Monoid";

import { identity } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Monoid Const
 * -------------------------------------------
 */

/**
 * @category Monoid
 * @since 1.0.0
 */
export function getMonoid<E, A>(M: Monoid<E>): Monoid<Const<E, A>> {
  return identity(M) as any;
}
