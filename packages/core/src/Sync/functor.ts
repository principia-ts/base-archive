import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as X from "../SIO";
import type { Sync, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Sync
 * -------------------------------------------
 */

export const map_: <R, E, A, B>(fa: Sync<R, E, A>, f: (a: A) => B) => Sync<R, E, B> = X.map_;

export const map: <A, B>(f: (a: A) => B) => <R, E>(fa: Sync<R, E, A>) => Sync<R, E, B> = X.map;

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map_,
  map
});
