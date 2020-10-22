import type { Semigroup } from "@principia/prelude";

import * as A from "../Array";
import type { NonEmptyArray } from "./model";

/**
 * ```haskell
 * fold :: Semigroup s => s a -> NonEmptyArray a -> a
 * ```
 */
export const fold = <A>(S: Semigroup<A>) => (as: NonEmptyArray<A>): A => A.reduce_(as.slice(1), as[0], S.combine_);
