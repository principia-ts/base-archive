import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { zipWith_ } from "./apply";
import { Functor } from "./functor";
import type { URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Array
 * -------------------------------------------
 */

export function zip_<A, B>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>
): ReadonlyArray<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b]);
}

export function zip<B>(
  fb: ReadonlyArray<B>
): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

export const both_ = zip_;

export const both = zip;

/**
 * ```haskell
 * pure :: a -> Array a
 * ```
 *
 * Lifts a value into an Array
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): ReadonlyArray<A> {
  return [a];
}

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  both_: zip_,
  both: zip,
  unit
});
