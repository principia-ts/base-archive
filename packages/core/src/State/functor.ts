import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { State, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor State
 * -------------------------------------------
 */

export function map_<S, A, B>(fa: State<S, A>, f: (a: A) => B): State<S, B> {
  return (s) => {
    const [a, s2] = fa(s);
    return [f(a), s2];
  };
}

export function map<A, B>(f: (a: A) => B): <S>(fa: State<S, A>) => State<S, B> {
  return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map_,
  map
});
