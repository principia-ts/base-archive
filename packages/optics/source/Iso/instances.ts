import * as HKT from "@principia/core/HKT";
import type * as TC from "@principia/core/typeclass-index";

import { id } from "./constructors";
import type { URI, V } from "./Iso";
import { compose, imap, imap_ } from "./methods";

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
   compose
});
