import { flow } from "@principia/core/Function";
import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { id } from "./constructors";
import type { Iso, URI, V } from "./model";

/*
 * -------------------------------------------
 * Semigroupoid Iso
 * -------------------------------------------
 */

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose_ = <I, A, B>(sa: Iso<I, A>, ab: Iso<A, B>): Iso<I, B> => ({
   get: flow(sa.get, ab.get),
   reverseGet: flow(ab.reverseGet, sa.reverseGet)
});

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose = <A, B>(ab: Iso<A, B>) => <I>(sa: Iso<I, A>): Iso<I, B> => compose_(sa, ab);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: TC.Category<[URI], V> = HKT.instance({
   id,
   compose,
   compose_
});
