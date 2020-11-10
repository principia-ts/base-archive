import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { make } from "./constructors";
import { map, map_ } from "./functor";
import type { Const, URI, V } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Const
 * -------------------------------------------
 */

export const bimap_ = <E, A, D, B>(pab: Const<E, A>, f: (e: E) => D, _: (a: A) => B): Const<D, B> => make(f(pab));

export const bimap = <E, A, D, B>(f: (e: E) => D, g: (a: A) => B) => (pab: Const<E, A>): Const<D, B> =>
   bimap_(pab, f, g);

export const first_ = <E, A, D>(pab: Const<E, A>, f: (e: E) => D): Const<D, A> => make(f(pab));

export const first = <E, D>(f: (e: E) => D) => <A>(pab: Const<E, A>): Const<D, A> => make(f(pab));

/**
 * @category Bifunctor
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
   bimap_: bimap_,
   bimap,
   first_: first_,
   first,
   second_: map_,
   second: map
});
