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
export function composePrism_<S, A, B>(sa: Lens<S, A>, ab: Prism<A, B>): Optional<S, B> {
  return _.lensComposePrism(ab)(sa);
}

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
export function composeOptional_<S, A, B>(sa: Lens<S, A>, ab: Optional<A, B>): Optional<S, B> {
  return _.optionalComposeOptional(ab)(asOptional(sa));
}

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional<A, B>(ab: Optional<A, B>): <S>(sa: Lens<S, A>) => Optional<S, B> {
  return (sa) => composeOptional_(sa, ab);
}
