import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { concat_ } from "./combinators";
import { Functor } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Alt Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa: ReadonlyArray<A>, that: () => ReadonlyArray<A>): ReadonlyArray<A> {
   return concat_(fa, that());
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<A>(that: () => ReadonlyArray<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
   return (fa) => alt_(fa, that);
}

export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});
