import type { Eq } from "@principia/prelude/Eq";

import { elem_ } from "./guards";

/*
 * -------------------------------------------
 * Set Constructors
 * -------------------------------------------
 */

export function fromSet<A>(s: Set<A>): ReadonlySet<A> {
   return new Set(s);
}

export function empty<A>(): ReadonlySet<A> {
   return new Set();
}

export function singleton<A>(a: A): ReadonlySet<A> {
   return new Set([a]);
}

export function fromArray_<A>(as: ReadonlyArray<A>, E: Eq<A>): ReadonlySet<A> {
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
}

export function fromArray<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlySet<A> {
   return (as) => fromArray_(as, E);
}
