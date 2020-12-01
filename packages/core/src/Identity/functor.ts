import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Identity
 * -------------------------------------------
 */

export function map_<A, B>(fa: A, f: (a: A) => B) {
  return f(fa);
}

export function map<A, B>(f: (a: A) => B): (fa: A) => B {
  return (fa) => f(fa);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map_,
  map
});
