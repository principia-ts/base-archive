import { flow } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";

import * as _ from "../internal";
import { Lens } from "../Lens";
import { Optional } from "../Optional";
import { Prism } from "../Prism";
import { Traversal } from "../Traversal";
import { Iso } from "./Iso";

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
export const asPrism = <S, A>(sa: Iso<S, A>): Prism<S, A> => ({
   getMaybe: flow(sa.get, Mb.just),
   reverseGet: sa.reverseGet
});

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
export const asTraversal = <S, A>(sa: Iso<S, A>): Traversal<S, A> => ({
   modifyF: _.implementModifyF<S, A>()((_) => (F) => (f) => (s) =>
      F._map(f(sa.get(s)), (a) => sa.reverseGet(a))
   )
});
