import { flow } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import type * as TC from "@principia/core/typeclass-index";

import type { URI, V } from "./Prism";

/*
 * -------------------------------------------
 * Prism Methods
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap_: TC.UC_IMapF<[URI], V> = (ea, ab, ba) => ({
   getOption: flow(ea.getOption, O.map(ab)),
   reverseGet: flow(ba, ea.reverseGet)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: TC.IMapF<[URI], V> = (ab, ba) => (ea) => imap_(ea, ab, ba);
