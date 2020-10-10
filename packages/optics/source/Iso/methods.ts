import { flow } from "@principia/core/Function";
import type * as P from "@principia/prelude";

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
export const imap_: P.IMapFn_<[URI], V> = (ea, ab, ba) => ({
   get: flow(ea.get, ab),
   reverseGet: flow(ba, ea.reverseGet)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap: P.IMapFn<[URI], V> = (ab, ba) => (ea) => imap_(ea, ab, ba);

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose_: P.ComposeFn_<[URI], V> = (sa, ab) => ({
   get: flow(sa.get, ab.get),
   reverseGet: flow(ab.reverseGet, sa.reverseGet)
});

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose: P.ComposeFn<[URI], V> = (ab) => (sa) => compose_(sa, ab);
