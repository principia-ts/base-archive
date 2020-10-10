import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { compose, compose_ } from "./compositions";
import { id } from "./constructors";
import { imap, imap_ } from "./methods";
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
   imap_,
   imap
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: TC.Category<[URI], V> = HKT.instance({
   compose,
   compose_,
   id
});
