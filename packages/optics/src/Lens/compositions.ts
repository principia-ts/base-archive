import * as _ from "../internal";
import type { Optional } from "../Optional";
import type { Prism } from "../Prism";
import { asOptional } from "./converters";
import type { Lens } from "./model";

/*
 * -------------------------------------------
 * Lens Compositions
 * -------------------------------------------
 */

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composePrism_ = <S, A, B>(sa: Lens<S, A>, ab: Prism<A, B>): Optional<S, B> => _.lensComposePrism(ab)(sa);

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
export const composeOptional_ = <S, A, B>(sa: Lens<S, A>, ab: Optional<A, B>): Optional<S, B> =>
   _.optionalComposeOptional(ab)(asOptional(sa));

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeOptional = <A, B>(ab: Optional<A, B>) => <S>(sa: Lens<S, A>): Optional<S, B> =>
   composeOptional_(sa, ab);