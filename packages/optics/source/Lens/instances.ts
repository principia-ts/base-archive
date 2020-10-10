import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { compose, compose_ } from "./compositions";
import { id } from "./constructors";
import type { URI, V } from "./Lens";
import { imap, imap_ } from "./methods";

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

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: P.Category<[URI], V> = HKT.instance({
   id,
   compose,
   compose_
});
