import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { tuple } from "../Function";
import { zipWith_ } from "./apply";
import { right } from "./constructors";
import { Functor } from "./functor";
import type { Either, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * zip_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`, collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip_<E, A, G, B>(
  fa: Either<E, A>,
  fb: Either<G, B>
): Either<E | G, readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

/**
 * ```haskell
 * zip :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`, collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip<G, B>(
  fb: Either<G, B>
): <E, A>(fa: Either<E, A>) => Either<G | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `Either`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <E = never, A = never>(a: A) => Either<E, A> = right;

/**
 * @category Instances
 * @since 1.0.0
 */
export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});
