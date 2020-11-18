import * as _ from "../internal";
import type { Lens } from "../Lens";
import type { Optional } from "../Optional";
import { asOptional } from "./converters";
import type { Prism } from "./model";

/*
 * -------------------------------------------
 * Prism Compositions
 * -------------------------------------------
 */

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeLens_<S, A, B>(sa: Prism<S, A>, ab: Lens<A, B>): Optional<S, B> {
  return _.prismComposeLens(ab)(sa);
}

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
export function composeOptional_<S, A, B>(sa: Prism<S, A>, ab: Optional<A, B>): Optional<S, B> {
  return _.optionalComposeOptional(ab)(asOptional(sa));
}

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional<A, B>(ab: Optional<A, B>): <S>(sa: Prism<S, A>) => Optional<S, B> {
  return (sa) => composeOptional_(sa, ab);
}
