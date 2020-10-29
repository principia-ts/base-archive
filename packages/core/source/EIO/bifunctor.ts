import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../XPure";
import { fail, succeed } from "./constructors";
import { map, map_ } from "./functor";
import type { EIO, URI, V } from "./model";

/*
 * -------------------------------------------
 * Bifunctor EIO
 * -------------------------------------------
 */

export const bimap_: <E, A, B, C>(pab: EIO<E, A>, f: (e: E) => B, g: (a: A) => C) => EIO<B, C> = X.bimap_;

export const bimap: <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => (pab: EIO<E, A>) => EIO<B, C> = X.bimap;

export const first_: <E, A, B>(pab: EIO<E, A>, f: (e: E) => B) => EIO<B, A> = X.first_;

export const first: <E, B>(f: (e: E) => B) => <A>(pab: EIO<E, A>) => EIO<B, A> = X.first;

export const swap = <E, A>(pab: EIO<E, A>): EIO<A, E> => X.foldM_(pab, succeed, fail);

/**
 * @category Bifunctor
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
   bimap_,
   bimap,
   first_,
   first,
   second_: map_,
   second: map
});
