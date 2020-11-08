import type { Monoid } from "@principia/prelude/Monoid";

import type { Tuple } from "./model";

/*
 * -------------------------------------------
 * Unit Tuple
 * -------------------------------------------
 */

export const unit = <M>(M: Monoid<M>) => (): Tuple<void, M> => [undefined, M.nat] as const;
