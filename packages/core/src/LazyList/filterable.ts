import type { Predicate, Refinement, Trampoline } from "../Function";
import { done, more, trampoline } from "../Function";
import { head, tail } from "./combinators";
import { cons_, list, nil } from "./constructors";
import { isEmpty } from "./guards";
import type { LazyList, URI, V } from "./model";

/*
 * -------------------------------------------
 * Filterable LazyList
 * -------------------------------------------
 */

export const filter_: {
   <A, B extends A>(xs: LazyList<A>, refinement: Refinement<A, B>): LazyList<B>;
   <A>(xs: LazyList<A>, predicate: Predicate<A>): LazyList<A>;
} = trampoline(function _filter_<A>(xs: LazyList<A>, predicate: Predicate<A>): Trampoline<LazyList<A>> {
   if (isEmpty(xs)) return done(nil);
   const a = head(xs);
   const as = tail(xs);
   return predicate(a)
      ? done(
           cons_(
              () => a,
              () => trampoline(_filter_)(as, predicate)
           )
        )
      : more(() => _filter_(as, predicate));
});

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): (xs: LazyList<A>) => LazyList<B>;
   <A>(predicate: Predicate<A>): (xs: LazyList<A>) => LazyList<A>;
} = <A>(predicate: Predicate<A>) => (xs: LazyList<A>): LazyList<A> => filter_(xs, predicate);
