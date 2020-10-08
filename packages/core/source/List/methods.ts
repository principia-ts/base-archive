import type { Predicate, Trampoline } from "../Function";
import { done, matchPredicate, more, trampoline } from "../Function";
import type * as TC from "../typeclass-index";
import { head, tail } from "./combinators";
import { cons_, list, nil } from "./constructors";
import { isEmpty, isNonEmpty } from "./guards";
import type { List, URI, V } from "./List";

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

export const map_: TC.UC_MapF<[URI], V> = <A, B>(xs: List<A>, f: (a: A) => B): List<B> =>
   isEmpty(xs)
      ? nil
      : cons_(
           () => f(head(xs)),
           () => map_(tail(xs), f)
        );

export const map: TC.MapF<[URI], V> = (f) => (fa) => map_(fa, f);

export const pure: TC.PureF<[URI], V> = list;

export const filter_ = trampoline(function filter_<A>(xs: List<A>, predicate: Predicate<A>): Trampoline<List<A>> {
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

export const filter: TC.FilterF<[URI], V> = <A>(predicate: Predicate<A>) => (xs: List<A>): List<A> =>
   filter_(xs, predicate);

/*
 * export const filter_: TC.UC_FilterF<[URI], V> = <A>(fa: List<A>, f: Predicate<A>): List<A> => {
 *    if (isEmpty(fa)) return nil();
 *    const x = head(fa);
 *    const xs = tail(fa);
 *    return f(x) ? cons_(x, filter_(xs, f)) : filter_(xs, f);
 * };
 *
 * export const filter: TC.FilterF<[URI], V> = <A>(f: Predicate<A>) => (fa: List<A>) => filter_(fa, f);
 */
