import { head, tail } from "./combinators";
import { isEmpty, isNonEmpty } from "./guards";
import type { List } from "./model";

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export const toArray = <A>(xs: List<A>): ReadonlyArray<A> => {
   if (isEmpty(xs)) return [];
   const r = [];
   let l: List<A> = xs;
   while (isNonEmpty(l)) {
      r.push(head(l));
      l = tail(l);
   }
   return r;
};
