import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Reader, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Reader
 * -------------------------------------------
 */

export function map_<R, A, B>(fa: Reader<R, A>, f: (a: A) => B): Reader<R, B> {
  return (r) => f(fa(r));
}

export function map<A, B>(f: (a: A) => B): <R>(fa: Reader<R, A>) => Reader<R, B> {
  return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map_,
  map
});
