import { flow } from "@principia/core/Function";
import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Lens, URI, V } from "./model";

/*
 * -------------------------------------------
 * Invariant Lens
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap_ = <I, A, B>(ea: Lens<I, A>, ab: (a: A) => B, ba: (b: B) => A): Lens<I, B> => ({
   get: flow(ea.get, ab),
   set: flow(ba, ea.set)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap = <A, B>(ab: (a: A) => B, ba: (b: B) => A) => <I>(ea: Lens<I, A>): Lens<I, B> => imap_(ea, ab, ba);

/*
 * -------------------------------------------
 * Lens Typeclass Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<[URI], V> = HKT.instance({
   imap_,
   imap
});
