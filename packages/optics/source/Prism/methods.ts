import { flow } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import type * as P from "@principia/prelude";

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
export const imap_: P.IMapFn_<[URI], V> = (ea, ab, ba) => ({
   getOption: flow(ea.getOption, O.map(ab)),
   reverseGet: flow(ba, ea.reverseGet)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: P.IMapFn<[URI], V> = (ab, ba) => (ea) => imap_(ea, ab, ba);
