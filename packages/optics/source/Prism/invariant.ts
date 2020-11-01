import { flow } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Prism, URI, V } from "./model";

/*
 * -------------------------------------------
 * Invariant Prism
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap_ = <S, A, B>(ea: Prism<S, A>, ab: (a: A) => B, ba: (b: B) => A): Prism<S, B> => ({
   getOption: flow(ea.getOption, O.map(ab)),
   reverseGet: flow(ba, ea.reverseGet)
});

/**
 * @category Invariant
 * @since 1.0.0
 */
export const imap = <A, B>(ab: (a: A) => B, ba: (b: B) => A) => <S>(ea: Prism<S, A>): Prism<S, B> => imap_(ea, ab, ba);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: TC.Invariant<[URI], V> = HKT.instance({
   imap_,
   imap
});
