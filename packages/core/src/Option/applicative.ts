import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { tuple } from "../Function";
import { zipWith_ } from "./apply";
import { some } from "./constructors";
import { Functor } from "./functor";
import type { Option, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Option
 * -------------------------------------------
 */

/**
 * ```haskell
 * zip_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise, returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip_<A, B>(fa: Option<A>, fb: Option<B>): Option<readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info a `Option`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <A>(a: A) => Option<A> = some;

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});
