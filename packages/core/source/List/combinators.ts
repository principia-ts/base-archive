import type { Lazy, Trampoline } from "../Function";
import { done, matchPredicate, more, trampoline } from "../Function";
import type { CompareF } from "../Ord";
import { GT } from "../Ordering";
import { cons, cons_, list, nil } from "./constructors";
import { isEmpty, isNonEmpty } from "./guards";
import type { List } from "./List";
import { errorEmptyList } from "./List";

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

export const rangeBy_ = (start: number, end: number, step: (n: number) => number): List<number> => {
   if (start === end)
      return cons_(
         () => start,
         () => nil
      );

   return cons_(
      () => start,
      () => rangeBy_(step(start), end, step)
   );
};

export const init: <A>(xs: List<A>) => List<A> = matchPredicate(
   isNonEmpty,
   (l) =>
      isEmpty(tail(l))
         ? nil
         : cons_(
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

export const take_ = <A>(xs: List<A>, n: number): List<A> => {
   if (n <= 0) return nil;
   if (isEmpty(xs)) return nil;
   return cons_(
      () => head(xs),
      () => take_(tail(xs), n - 1)
   );
};

export const take = (n: number) => <A>(xs: List<A>) => take_(xs, n);

export const lines: (s: string) => List<string> = matchPredicate(
   (s) => s.length === 0,
   (_) => nil,
   (s) => list(...s.split("\n"))
);

/* eslint-disable @typescript-eslint/no-use-before-define */

export function sortBy_<A>(xs: List<A>, cmp: CompareF<A>): List<A> {
   const _sequences_ = (xs: List<A>): Trampoline<List<List<A>>> => {
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
         return _descending_(b, list(a), as);
      }
      return _ascending_(b, cons(() => a) as any, as);
   };

   const _ascending_ = (a: A, fas: (xs: Lazy<List<A>>) => List<A>, bbs: List<A>): Trampoline<List<List<A>>> => {
      if (isEmpty(bbs)) {
         return done(
            cons_(
               () => fas(() => list(a)),
               () => trampoline(_sequences_)(bbs)
            )
         );
      }
      const b = head(bbs);
      const bs = tail(bbs);
      const ys = (ys: Lazy<List<A>>) => fas(() => cons_(() => a, ys));
      if (cmp(a)(b) !== GT) {
         return more(() => _ascending_(b, ys, bs));
      }
      return done(
         cons_(
            () => fas(() => list(a)),
            () => trampoline(_sequences_)(bbs)
         )
      );
   };

   const _descending_ = (a: A, as: List<A>, bbs: List<A>): Trampoline<List<List<A>>> => {
      if (isEmpty(bbs)) {
         return done(
            cons_(
               () =>
                  cons_(
                     () => a,
                     () => as
                  ),
               () => trampoline(_sequences_)(bbs)
            )
         );
      }
      const b = head(bbs);
      const bs = tail(bbs);
      if (cmp(a)(b) === GT) {
         return more(() =>
            _descending_(
               b,
               cons_(
                  () => a,
                  () => as
               ),
               bs
            )
         );
      }
      return done(
         cons_(
            () =>
               cons_(
                  () => a,
                  () => as
               ),
            () => trampoline(_sequences_)(bbs)
         )
      );
   };

   const _mergePairs_ = (as: List<List<A>>): Trampoline<List<List<A>>> => {
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
         cons_(
            () => trampoline(_merge_)(a, b),
            () => trampoline(_mergePairs_)(xs)
         )
      );
   };

   const _merge_ = (as: List<A>, bs: List<A>): Trampoline<List<A>> => {
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
            cons_(
               () => b,
               () => trampoline(_merge_)(as, bs1)
            )
         );
      }
      return done(
         cons_(
            () => a,
            () => trampoline(_merge_)(as1, bs)
         )
      );
   };

   const _mergeAll_ = (xs: List<List<A>>): Trampoline<List<A>> => {
      if (isEmpty(tail(xs))) {
         return done(head(xs));
      }
      return more(() => _mergeAll_(trampoline(_mergePairs_)(xs)));
   };

   return trampoline(_mergeAll_)(trampoline(_sequences_)(xs));
}

/* eslint-enable */

export const sortBy = <A>(cmp: CompareF<A>) => (xs: List<A>) => sortBy_(xs, cmp);

export const append_ = trampoline(function append<A>(xs: List<A>, ys: List<A>): Trampoline<List<A>> {
   if (isEmpty(xs)) return done(ys);
   if (isEmpty(ys)) return done(xs);
   return done(
      cons_(
         () => head(xs),
         () => trampoline(append)(tail(xs), ys)
      )
   );
});
