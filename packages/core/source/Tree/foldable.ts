import type { Monoid } from "@principia/prelude/Monoid";

import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Foldable Tree
 * -------------------------------------------
 */

export const reduce_ = <A, B>(fa: Tree<A>, b: B, f: (b: B, a: A) => B): B => {
   let r: B = f(b, fa.value);
   const len = fa.forest.length;
   for (let i = 0; i < len; i++) {
      r = reduce_(fa.forest[i], r, f);
   }
   return r;
};

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Tree<A>): B => reduce_(fa, b, f);

export const reduceRight_ = <A, B>(fa: Tree<A>, b: B, f: (a: A, b: B) => B): B => {
   let r: B = b;
   const len = fa.forest.length;
   for (let i = len - 1; i >= 0; i--) {
      r = reduceRight_(fa.forest[i], r, f);
   }
   return f(fa.value, r);
};

export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Tree<A>): B => reduceRight_(fa, b, f);

export const foldMap_ = <M>(M: Monoid<M>) => <A>(fa: Tree<A>, f: (a: A) => M): M =>
   reduce_(fa, M.nat, (acc, a) => M.combine_(acc, f(a)));

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Tree<A>) => foldMap_(M)(fa, f);
