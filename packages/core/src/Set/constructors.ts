import type { Eq } from "@principia/prelude/Eq";

import { elem_ } from "./guards";

/*
 * -------------------------------------------
 * Set Constructors
 * -------------------------------------------
 */

export const fromSet = <A>(s: Set<A>): ReadonlySet<A> => new Set(s);

export const empty: ReadonlySet<never> = new Set();

export const singleton = <A>(a: A): ReadonlySet<A> => new Set([a]);

export const fromArray_ = <A>(as: ReadonlyArray<A>, E: Eq<A>): ReadonlySet<A> => {
   const len = as.length;
   const r = new Set<A>();
   const has = elem_(E);
   for (let i = 0; i < len; i++) {
      const a = as[i];
      if (!has(r, a)) {
         r.add(a);
      }
   }
   return r;
};

export const fromArray = <A>(E: Eq<A>) => (as: ReadonlyArray<A>): ReadonlySet<A> => fromArray_(as, E);
