import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array";
import { Functor } from "./functor";
import type { NonEmptyArray, URI, V } from "./model";

/*
 * -------------------------------------------
 * Alt NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_: <A>(fa: NonEmptyArray<A>, that: () => NonEmptyArray<A>) => NonEmptyArray<A> = A.alt_ as any;

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt: <A>(that: () => NonEmptyArray<A>) => (fa: NonEmptyArray<A>) => NonEmptyArray<A> = A.alt as any;

export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});
