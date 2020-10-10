import { flow } from "@principia/core/Function";
import type * as TC from "@principia/prelude";

import type { URI, V } from "./Lens";

/*
 * -------------------------------------------
 * Lens Methods
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap_: TC.IMapFn_<[URI], V> = (ea, ab, ba) => ({
   get: flow(ea.get, ab),
   set: flow(ba, ea.set)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: TC.IMapFn<[URI], V> = (ab, ba) => (ea) => imap_(ea, ab, ba);
