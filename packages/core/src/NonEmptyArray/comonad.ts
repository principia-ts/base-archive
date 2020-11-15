import type * as P from "@principia/prelude";

import * as A from "../Array/_core";
import { head } from "./combinators";
import type { NonEmptyArray, URI, V } from "./model";

/*
 * -------------------------------------------
 * Comonad NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * extract :: (Comonad m) => m a -> a
 * ```
 *
 * @category Comonad
 * @since 1.0.0
 */
export const extract: <A>(ma: NonEmptyArray<A>) => A = head;
