import { done, matchPredicate, more, Predicate, Trampoline, trampoline } from "../Function";
import type * as TC from "../typeclass-index";
import { head, tail } from "./combinators";
import { _cons, list, nil } from "./constructors";
import { isEmpty, isNonEmpty } from "./guards";
import type { List, URI, V } from "./List";

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

export const _map: TC.UC_MapF<[URI], V> = <A, B>(xs: List<A>, f: (a: A) => B): List<B> =>
   isEmpty(xs)
      ? nil
      : _cons(
           () => f(head(xs)),
           () => _map(tail(xs), f)
        );

export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

export const pure: TC.PureF<[URI], V> = list;

export const _filter = trampoline(function _filter<A>(xs: List<A>, predicate: Predicate<A>): Trampoline<List<A>> {
   if (isEmpty(xs)) return done(nil);
   const a = head(xs);
   const as = tail(xs);
   return predicate(a)
      ? done(
           _cons(
              () => a,
              () => trampoline(_filter)(as, predicate)
           )
        )
      : more(() => _filter(as, predicate));
});

export const filter: TC.FilterF<[URI], V> = <A>(predicate: Predicate<A>) => (xs: List<A>): List<A> =>
   _filter(xs, predicate);

/*
 * export const _filter: TC.UC_FilterF<[URI], V> = <A>(fa: List<A>, f: Predicate<A>): List<A> => {
 *    if (isEmpty(fa)) return nil();
 *    const x = head(fa);
 *    const xs = tail(fa);
 *    return f(x) ? _cons(x, _filter(xs, f)) : _filter(xs, f);
 * };
 *
 * export const filter: TC.FilterF<[URI], V> = <A>(f: Predicate<A>) => (fa: List<A>) => _filter(fa, f);
 */
