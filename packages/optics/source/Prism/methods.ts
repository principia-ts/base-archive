import { flow } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";
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
export const _imap: TC.UC_IMapF<[URI], V> = (ea, ab, ba) => ({
   getMaybe: flow(ea.getMaybe, Mb.map(ab)),
   reverseGet: flow(ba, ea.reverseGet)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: TC.IMapF<[URI], V> = (ab, ba) => (ea) => _imap(ea, ab, ba);
