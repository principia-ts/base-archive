import type * as TC from "@principia/core/typeclass-index";

import * as _ from "../internal";
import type { Optional } from "../Optional";
import type { Prism } from "../Prism";
import { asOptional } from "./converters";
import type { Lens, URI, V } from "./Lens";

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
export const _compose: TC.UC_ComposeF<[URI], V> = (sa, ab) => _.lensComposeLens(ab)(sa);

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose: TC.ComposeF<[URI], V> = _.lensComposeLens;

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const _composePrism = <S, A, B>(sa: Lens<S, A>, ab: Prism<A, B>): Optional<S, B> =>
   _.lensComposePrism(ab)(sa);

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composePrism = _.lensComposePrism;

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const _composeOptional = <S, A, B>(sa: Lens<S, A>, ab: Optional<A, B>): Optional<S, B> =>
   _.optionalComposeOptional(ab)(asOptional(sa));

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeOptional = <A, B>(ab: Optional<A, B>) => <S>(sa: Lens<S, A>): Optional<S, B> =>
   _composeOptional(sa, ab);
