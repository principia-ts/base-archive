import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../SIO";
import { Functor } from "./functor";
import type { Sync, URI, V } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Sync
 * -------------------------------------------
 */

export const bimap_: <R, E, A, B, C>(
  pab: Sync<R, E, A>,
  f: (e: E) => B,
  g: (a: A) => C
) => Sync<R, B, C> = X.bimap_;

export const bimap: <E, A, B, C>(
  f: (e: E) => B,
  g: (a: A) => C
) => <R>(pab: Sync<R, E, A>) => Sync<R, B, C> = X.bimap;

export const mapError_: <R, E, A, B>(pab: Sync<R, E, A>, f: (e: E) => B) => Sync<R, B, A> =
  X.mapError_;

export const mapError: <E, B>(f: (e: E) => B) => <R, A>(pab: Sync<R, E, A>) => Sync<R, B, A> =
  X.mapError;

export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
  ...Functor,
  bimap_,
  bimap,
  mapLeft_: mapError_,
  mapLeft: mapError
});
