import type * as TC from "@principia/prelude";

import * as _ from "../internal";
import type { URI, V } from "./Traversal";

/*
 * -------------------------------------------
 * Traversal Methods
 * -------------------------------------------
 */

/**
 * Compose a `Traversal` with a `Traversal`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose_: TC.ComposeFn_<[URI], V> = (sa, ab) => _.traversalComposeTraversal(ab)(sa);

/**
 * Compose a `Traversal` with a `Traversal`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose: TC.ComposeFn<[URI], V> = _.traversalComposeTraversal;
