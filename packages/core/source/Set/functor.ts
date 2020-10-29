import type { Eq } from "@principia/prelude/Eq";

import { elem } from "./guards";

/*
 * -------------------------------------------
 * Functor Set
 * -------------------------------------------
 */

export const map_ = <B>(E: Eq<B>) => <A>(set: ReadonlySet<A>, f: (a: A) => B) => {
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

export const map = <B>(E: Eq<B>) => <A>(f: (a: A) => B) => (set: ReadonlySet<A>) => map_(E)(set, f);
