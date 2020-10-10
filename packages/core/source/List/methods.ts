import type * as TC from "@principia/prelude";

import type { Predicate, Trampoline } from "../Function";
import { done, matchPredicate, more, trampoline } from "../Function";
import { head, tail } from "./combinators";
import { cons_, list, nil } from "./constructors";
import { isEmpty, isNonEmpty } from "./guards";
import type { List, URI, V } from "./List";

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

export const map_: TC.MapFn_<[URI], V> = <A, B>(xs: List<A>, f: (a: A) => B): List<B> =>
   isEmpty(xs)
      ? nil
      : cons_(
           () => f(head(xs)),
           () => map_(tail(xs), f)
        );

export const map: TC.MapFn<[URI], V> = (f) => (fa) => map_(fa, f);

export const pure: TC.PureFn<[URI], V> = list;

export const filter_: TC.FilterFn_<[URI], V> = trampoline(function filter_<A>(
   xs: List<A>,
   predicate: Predicate<A>
): Trampoline<List<A>> {
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

export const filter: TC.FilterFn<[URI], V> = <A>(predicate: Predicate<A>) => (xs: List<A>): List<A> =>
   filter_(xs, predicate);
