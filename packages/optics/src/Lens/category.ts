import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as _ from "../internal";
import { id } from "./constructors";
import type { Lens, URI, V } from "./model";

/*
 * -------------------------------------------
 * Lens Compositions
 * -------------------------------------------
 */

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, A, B>(sa: Lens<S, A>, ab: Lens<A, B>): Lens<S, B> {
   return _.lensComposeLens(ab)(sa);
}

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose = _.lensComposeLens;

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: P.Category<[URI], V> = HKT.instance({
   id,
   compose,
   compose_
});
