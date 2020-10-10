import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { id } from "./constructors";
import type { URI, V } from "./Iso";
import { compose, compose_, imap, imap_ } from "./methods";

/*
 * -------------------------------------------
 * Iso Typeclass Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: TC.Invariant<[URI], V> = HKT.instance({
   imap_,
   imap
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: TC.Category<[URI], V> = HKT.instance({
   id,
   compose,
   compose_
});
