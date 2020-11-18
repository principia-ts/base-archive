import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../XPure";
import { fail, succeed } from "./constructors";
import { Functor } from "./functor";
import type { EIO, URI, V } from "./model";

/*
 * -------------------------------------------
 * Bifunctor EIO
 * -------------------------------------------
 */

export const bimap_: <E, A, B, C>(pab: EIO<E, A>, f: (e: E) => B, g: (a: A) => C) => EIO<B, C> =
  X.bimap_;

export const bimap: <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => (pab: EIO<E, A>) => EIO<B, C> =
  X.bimap;

export const mapError_: <E, A, B>(pab: EIO<E, A>, f: (e: E) => B) => EIO<B, A> = X.mapError_;

export const mapError: <E, B>(f: (e: E) => B) => <A>(pab: EIO<E, A>) => EIO<B, A> = X.mapError;

export function swap<E, A>(pab: EIO<E, A>): EIO<A, E> {
  return X.foldM_(pab, succeed, fail);
}

/**
 * @category Bifunctor
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
  ...Functor,
  bimap_,
  bimap,
  mapLeft_: mapError_,
  mapLeft: mapError
});
