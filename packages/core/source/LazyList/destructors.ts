import { head, tail } from "./combinators";
import { isEmpty, isNonEmpty } from "./guards";
import type { LazyList } from "./model";

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export const toArray = <A>(xs: LazyList<A>): ReadonlyArray<A> => {
   if (isEmpty(xs)) return [];
   const r = [];
   let l: LazyList<A> = xs;
   while (isNonEmpty(l)) {
      r.push(head(l));
      l = tail(l);
   }
   return r;
};
