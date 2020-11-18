import type { Monoid } from "@principia/prelude/Monoid";

import type { Tuple } from "./model";

/*
 * -------------------------------------------
 * Unit Tuple
 * -------------------------------------------
 */

export function unit<M>(M: Monoid<M>): () => Tuple<void, M> {
  return () => [undefined, M.nat] as const;
}
