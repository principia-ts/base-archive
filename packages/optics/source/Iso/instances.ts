import * as HKT from "@principia/core/HKT";
import * as TC from "@principia/core/typeclass-index";

import type { URI, V } from "./Iso";
import { _imap, compose, imap } from "./methods";
import { id } from "./constructors";

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
   _imap,
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
