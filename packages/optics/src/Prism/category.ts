import { flow } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import type * as TC from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { id } from "./constructors";
import type { Prism, URI, V } from "./model";

/*
 * -------------------------------------------
 * Semigroupoid Prism
 * -------------------------------------------
 */

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, A, B>(sa: Prism<S, A>, ab: Prism<A, B>): Prism<S, B> {
  return {
    getOption: flow(sa.getOption, O.chain(ab.getOption)),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  };
}

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose<A, B>(ab: Prism<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B> {
  return (sa) => compose_(sa, ab);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: TC.Category<[URI], V> = HKT.instance({
  compose,
  compose_,
  id
});
