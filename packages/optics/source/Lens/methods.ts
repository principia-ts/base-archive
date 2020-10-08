import { flow } from "@principia/core/Function";
import type * as TC from "@principia/core/typeclass-index";

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
export const imap_: TC.UC_IMapF<[URI], V> = (ea, ab, ba) => ({
   get: flow(ea.get, ab),
   set: flow(ba, ea.set)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: TC.IMapF<[URI], V> = (ab, ba) => (ea) => imap_(ea, ab, ba);
