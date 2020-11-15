import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import { Functor } from "./functor";
import type { NonEmptyArray, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative NonEmptyArray
 * -------------------------------------------
 */

export const zip_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<readonly [A, B]> = A.zip_ as any;

export const zip: <B>(
   fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> = A.zip as any;

/**
 * ```haskell
 * pure :: a -> NonEmptyArray a
 * ```
 *
 * Lifts a value into a `NonEmptyArray`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): NonEmptyArray<A> {
   return [a];
}

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_: zip_,
   both: zip,
   unit
});
