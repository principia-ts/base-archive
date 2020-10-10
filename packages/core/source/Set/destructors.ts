import type { Ord } from "@principia/prelude/Ord";
import { toNumber } from "@principia/prelude/Ordering";

export const toArray = <A>(O: Ord<A>) => (set: ReadonlySet<A>): ReadonlyArray<A> => {
   const r: Array<A> = [];
   set.forEach((e) => r.push(e));
   return r.sort((a, b) => toNumber(O.compare(a)(b)));
};

export const toSet = <A>(s: ReadonlySet<A>): Set<A> => new Set(s);
