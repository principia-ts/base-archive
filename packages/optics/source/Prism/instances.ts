import * as HKT from "@principia/core/HKT";
import type * as TC from "@principia/core/typeclass-index";

import { compose } from "./compositions";
import { id } from "./constructors";
import { _imap, imap } from "./methods";
import type { URI, V } from "./Prism";

/*
 * -------------------------------------------
 * Prism Typeclass Instances
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
   compose,
   id
});
