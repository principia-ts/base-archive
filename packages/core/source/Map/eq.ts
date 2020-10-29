import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { isSubmap_ } from "./guards";

/*
 * -------------------------------------------
 * Eq Map
 * -------------------------------------------
 */

/**
 * @category Eq
 * @since 1.0.0
 */
export const getEq = <K, A>(EK: Eq<K>, EA: Eq<A>): Eq<ReadonlyMap<K, A>> => {
   const isSubmapKA_ = isSubmap_(EK, EA);
   return fromEquals((x, y) => isSubmapKA_(x, y) && isSubmapKA_(y, x));
};
