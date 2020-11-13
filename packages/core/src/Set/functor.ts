import type { Eq } from "@principia/prelude/Eq";

import { elem } from "./guards";

/*
 * -------------------------------------------
 * Functor Set
 * -------------------------------------------
 */

export function map_<B>(E: Eq<B>) {
   return <A>(set: ReadonlySet<A>, f: (a: A) => B) => {
      const elemE = elem(E);
      const r = new Set<B>();
      set.forEach((e) => {
         const v = f(e);
         if (!elemE(v)(r)) {
            r.add(v);
         }
      });
      return r;
   };
}

export function map<B>(E: Eq<B>): <A>(f: (a: A) => B) => (set: ReadonlySet<A>) => Set<B> {
   return (f) => (set) => map_(E)(set, f);
}
