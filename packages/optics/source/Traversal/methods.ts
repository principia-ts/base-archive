import type * as TC from "@principia/core/typeclass-index";

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
export const _compose: TC.UC_ComposeF<[URI], V> = (sa, ab) => _.traversalComposeTraversal(ab)(sa);

/**
 * Compose a `Traversal` with a `Traversal`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose: TC.ComposeF<[URI], V> = _.traversalComposeTraversal;
