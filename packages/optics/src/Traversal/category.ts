import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as _ from "../internal";
import { id } from "./constructors";
import type { Traversal, URI, V } from "./model";

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
export const compose_ = <S, A, B>(sa: Traversal<S, A>, ab: Traversal<A, B>): Traversal<S, B> =>
   _.traversalComposeTraversal(ab)(sa);

/**
 * Compose a `Traversal` with a `Traversal`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose = _.traversalComposeTraversal;

export const Category: TC.Category<[URI], V> = HKT.instance({
   compose,
   compose_: (ab, bc) => compose(bc)(ab),
   id
});
