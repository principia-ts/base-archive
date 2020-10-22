import type * as TC from "@principia/prelude";

import type { Predicate, Trampoline } from "../Function";
import { done, more, trampoline } from "../Function";
import { head, tail } from "./combinators";
import { cons_, list, nil } from "./constructors";
import { isEmpty } from "./guards";
import type { LazyList, URI, V } from "./model";

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

export const map_: TC.MapFn_<[URI], V> = <A, B>(xs: LazyList<A>, f: (a: A) => B): LazyList<B> =>
   isEmpty(xs)
      ? nil
      : cons_(
           () => f(head(xs)),
           () => map_(tail(xs), f)
        );

export const map: TC.MapFn<[URI], V> = (f) => (fa) => map_(fa, f);

export const pure: TC.PureFn<[URI], V> = list;

export const filter_: TC.FilterFn_<[URI], V> = trampoline(function filter_<A>(
   xs: LazyList<A>,
   predicate: Predicate<A>
): Trampoline<LazyList<A>> {
   if (isEmpty(xs)) return done(nil);
   const a = head(xs);
   const as = tail(xs);
   return predicate(a)
      ? done(
           cons_(
              () => a,
              () => trampoline(filter_)(as, predicate)
           )
        )
      : more(() => filter_(as, predicate));
});

export const filter: TC.FilterFn<[URI], V> = <A>(predicate: Predicate<A>) => (xs: LazyList<A>): LazyList<A> =>
   filter_(xs, predicate);
