import { flow } from "@principia/core/Function";
import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Iso, URI, V } from "./model";

/*
 * -------------------------------------------
 * Invariant Iso
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export function imap_<I, A, B>(ea: Iso<I, A>, ab: (a: A) => B, ba: (b: B) => A): Iso<I, B> {
  return {
    get: flow(ea.get, ab),
    reverseGet: flow(ba, ea.reverseGet)
  };
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function imap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <I>(ea: Iso<I, A>) => Iso<I, B> {
  return (ea) => imap_(ea, ab, ba);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: TC.Invariant<[URI], V> = HKT.instance({
  imap_,
  imap
});
