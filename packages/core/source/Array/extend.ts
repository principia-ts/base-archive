import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor, mapWithIndex_ } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Extend Array
 * -------------------------------------------
 */

export const extend_ = <A, B>(wa: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): ReadonlyArray<B> =>
   mapWithIndex_(wa, (i, _) => f(wa.slice(i)));

/**
 * extend :: Extend w => (w a -> b) -> w a -> w b
 */
export const extend = <A, B>(f: (as: ReadonlyArray<A>) => B) => (wa: ReadonlyArray<A>): ReadonlyArray<B> =>
   extend_(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export const duplicate: <A>(wa: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> = (wa) => extend_(wa, identity);

export const Extend: P.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
});
