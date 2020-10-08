import { flow } from "@principia/core/Function";
import type * as TC from "@principia/core/typeclass-index";

import type { Iso, URI, V } from "./Iso";

/*
 * -------------------------------------------
 * Iso Methods
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap_: TC.UC_IMapF<[URI], V> = (ea, ab, ba) => ({
   get: flow(ea.get, ab),
   reverseGet: flow(ba, ea.reverseGet)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: TC.IMapF<[URI], V> = (ab, ba) => (ea) => imap_(ea, ab, ba);

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose_: TC.UC_ComposeF<[URI], V> = (sa, ab) => ({
   get: flow(sa.get, ab.get),
   reverseGet: flow(ab.reverseGet, sa.reverseGet)
});

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose: TC.ComposeF<[URI], V> = (ab) => (sa) => compose_(sa, ab);
