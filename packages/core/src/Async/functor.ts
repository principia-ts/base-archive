import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { succeed } from "./constructors";
import type { Async, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Functor Async
 * -------------------------------------------
 */

export function map_<R, E, A, B>(fa: Async<R, E, A>, f: (a: A) => B): Async<R, E, B> {
   return chain_(fa, (a) => succeed(f(a)));
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: Async<R, E, A>) => Async<R, E, B> {
   return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_,
   map
});
