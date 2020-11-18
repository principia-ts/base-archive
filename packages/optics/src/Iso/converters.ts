import { flow } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import * as _ from "../internal";
import type { Lens } from "../Lens";
import type { Optional } from "../Optional";
import type { Prism } from "../Prism";
import type { Traversal } from "../Traversal";
import type { Iso } from "./model";

/*
 * -------------------------------------------
 * Iso Converters
 * -------------------------------------------
 */

/**
 * View an `Iso` as a `Lens`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asLens: <S, A>(sa: Iso<S, A>) => Lens<S, A> = _.isoAsLens;

/**
 * View an `Iso` as a `Prism`
 *
 * @category Converters
 * @since 1.0.0
 */
export function asPrism<S, A>(sa: Iso<S, A>): Prism<S, A> {
  return {
    getOption: flow(sa.get, O.some),
    reverseGet: sa.reverseGet
  };
}

/**
 * View an `Iso` as a `Optional`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asOptional: <S, A>(sa: Iso<S, A>) => Optional<S, A> = _.isoAsOptional;

/**
 * View an `Iso` as a `Traversal`
 *
 * @category Converters
 * @since 1.0.0
 */
export function asTraversal<S, A>(sa: Iso<S, A>): Traversal<S, A> {
  return {
    modifyF: _.implementModifyF<S, A>()((_) => (F) => (f) => (s) =>
      F.map_(f(sa.get(s)), (a) => sa.reverseGet(a))
    )
  };
}
