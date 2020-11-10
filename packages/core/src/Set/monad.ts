import type { Eq } from "@principia/prelude/Eq";

import { identity } from "../Function";
import { elem } from "./guards";

/*
 * -------------------------------------------
 * Monad Set
 * -------------------------------------------
 */

export const chain_ = <B>(E: Eq<B>): (<A>(set: ReadonlySet<A>, f: (a: A) => ReadonlySet<B>) => ReadonlySet<B>) => {
   const elemE = elem(E);
   return (set, f) => {
      const r = new Set<B>();
      set.forEach((e) => {
         f(e).forEach((e) => {
            if (!elemE(e)(r)) {
               r.add(e);
            }
         });
      });
      return r;
   };
};

export const chain = <B>(E: Eq<B>) => <A>(f: (a: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => chain_(E)(set, f);

export const flatten: <A>(E: Eq<A>) => (ma: ReadonlySet<ReadonlySet<A>>) => ReadonlySet<A> = (E) => chain(E)(identity);
