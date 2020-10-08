import { flow } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import type * as TC from "@principia/core/typeclass-index";

import * as _ from "../internal";
import type { Lens } from "../Lens";
import type { Optional } from "../Optional";
import { asOptional } from "./converters";
import type { Prism, URI, V } from "./Prism";

/*
 * -------------------------------------------
 * Prism Compositions
 * -------------------------------------------
 */

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose_: TC.UC_ComposeF<[URI], V> = (sa, ab) => ({
   getOption: flow(sa.getOption, O.chain(ab.getOption)),
   reverseGet: flow(ab.reverseGet, sa.reverseGet)
});

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose: TC.ComposeF<[URI], V> = (ab) => (sa) => compose_(sa, ab);

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeLens_ = <S, A, B>(sa: Prism<S, A>, ab: Lens<A, B>): Optional<S, B> => _.prismComposeLens(ab)(sa);

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeLens = _.prismComposeLens;

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeOptional_ = <S, A, B>(sa: Prism<S, A>, ab: Optional<A, B>): Optional<S, B> =>
   _.optionalComposeOptional(ab)(asOptional(sa));

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeOptional = <A, B>(ab: Optional<A, B>) => <S>(sa: Prism<S, A>): Optional<S, B> =>
   composeOptional_(sa, ab);
