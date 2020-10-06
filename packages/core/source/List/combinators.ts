import { done, Lazy, matchPredicate, more, Trampoline, trampoline } from "../Function";
import { CompareF } from "../Ord";
import { GT } from "../Ordering";
import { _cons, cons, list, nil } from "./constructors";
import { isEmpty, isNonEmpty } from "./guards";
import { errorEmptyList, List } from "./List";

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export const head: <A>(xs: List<A>) => A = matchPredicate(
   isNonEmpty,
   (l) => l.head(),
   (_) => errorEmptyList("head")
);

export const tail: <A>(xs: List<A>) => List<A> = matchPredicate(
   isNonEmpty,
   (l) => l.tail(),
   (_) => errorEmptyList("tail")
);

export const _rangeBy = (start: number, end: number, step: (n: number) => number): List<number> => {
   if (start === end)
      return _cons(
         () => start,
         () => nil
      );

   return _cons(
      () => start,
      () => _rangeBy(step(start), end, step)
   );
};

export const init: <A>(xs: List<A>) => List<A> = matchPredicate(
   isNonEmpty,
   (l) =>
      isEmpty(tail(l))
         ? nil
         : _cons(
              () => head(l),
              () => init(tail(l))
           ),
   (_) => errorEmptyList("init")
);

export const last: <A>(xs: List<A>) => A = trampoline(function last<A>(xs: List<A>): Trampoline<A> {
   return matchPredicate(
      isNonEmpty,
      (l) => (isEmpty(tail(l)) ? done(head(l)) : more(() => last(tail(l)))),
      (_) => errorEmptyList("last")
   )(xs);
});

export const _take = <A>(xs: List<A>, n: number): List<A> => {
   if (n <= 0) return nil;
   if (isEmpty(xs)) return nil;
   return _cons(
      () => head(xs),
      () => _take(tail(xs), n - 1)
   );
};

export const take = (n: number) => <A>(xs: List<A>) => _take(xs, n);

export const lines: (s: string) => List<string> = matchPredicate(
   (s) => s.length === 0,
   (_) => nil,
   (s) => list(...s.split("\n"))
);

/* eslint-disable @typescript-eslint/no-use-before-define */

export function _sortBy<A>(xs: List<A>, cmp: CompareF<A>): List<A> {
   const __sequences = (xs: List<A>): Trampoline<List<List<A>>> => {
      if (isEmpty(xs)) {
         return done(list(xs));
      }
      let as = tail(xs);
      if (isEmpty(as)) {
         return done(list(xs));
      }
      const a = head(xs);
      const b = head(as);
      as = tail(as);
      if (cmp(a)(b) === GT) {
         return __descending(b, list(a), as);
      }
      return __ascending(b, cons(() => a) as any, as);
   };

   const __ascending = (a: A, fas: (xs: Lazy<List<A>>) => List<A>, bbs: List<A>): Trampoline<List<List<A>>> => {
      if (isEmpty(bbs)) {
         return done(
            _cons(
               () => fas(() => list(a)),
               () => trampoline(__sequences)(bbs)
            )
         );
      }
      const b = head(bbs);
      const bs = tail(bbs);
      const ys = (ys: Lazy<List<A>>) => fas(() => _cons(() => a, ys));
      if (cmp(a)(b) !== GT) {
         return more(() => __ascending(b, ys, bs));
      }
      return done(
         _cons(
            () => fas(() => list(a)),
            () => trampoline(__sequences)(bbs)
         )
      );
   };

   const __descending = (a: A, as: List<A>, bbs: List<A>): Trampoline<List<List<A>>> => {
      if (isEmpty(bbs)) {
         return done(
            _cons(
               () =>
                  _cons(
                     () => a,
                     () => as
                  ),
               () => trampoline(__sequences)(bbs)
            )
         );
      }
      const b = head(bbs);
      const bs = tail(bbs);
      if (cmp(a)(b) === GT) {
         return more(() =>
            __descending(
               b,
               _cons(
                  () => a,
                  () => as
               ),
               bs
            )
         );
      }
      return done(
         _cons(
            () =>
               _cons(
                  () => a,
                  () => as
               ),
            () => trampoline(__sequences)(bbs)
         )
      );
   };

   const __mergePairs = (as: List<List<A>>): Trampoline<List<List<A>>> => {
      if (isEmpty(as)) {
         return done(as);
      }
      let xs = tail(as);
      if (isEmpty(xs)) {
         return done(as);
      }
      const a = head(as);
      const b = head(xs);
      xs = tail(xs);
      return done(
         _cons(
            () => trampoline(__merge)(a, b),
            () => trampoline(__mergePairs)(xs)
         )
      );
   };

   const __merge = (as: List<A>, bs: List<A>): Trampoline<List<A>> => {
      if (isEmpty(as)) {
         return done(bs);
      }
      if (isEmpty(bs)) {
         return done(as);
      }
      const a = head(as);
      const as1 = tail(as);
      const b = head(bs);
      const bs1 = tail(bs);
      if (cmp(a)(b) === GT) {
         return done(
            _cons(
               () => b,
               () => trampoline(__merge)(as, bs1)
            )
         );
      }
      return done(
         _cons(
            () => a,
            () => trampoline(__merge)(as1, bs)
         )
      );
   };

   const __mergeAll = (xs: List<List<A>>): Trampoline<List<A>> => {
      if (isEmpty(tail(xs))) {
         return done(head(xs));
      }
      return more(() => __mergeAll(trampoline(__mergePairs)(xs)));
   };

   return trampoline(__mergeAll)(trampoline(__sequences)(xs));
}

/* eslint-enable */

export const sortBy = <A>(cmp: CompareF<A>) => (xs: List<A>) => _sortBy(xs, cmp);

export const _append = trampoline(function append<A>(xs: List<A>, ys: List<A>): Trampoline<List<A>> {
   if (isEmpty(xs)) return done(ys);
   if (isEmpty(ys)) return done(xs);
   return done(
      _cons(
         () => head(xs),
         () => trampoline(append)(tail(xs), ys)
      )
   );
});
