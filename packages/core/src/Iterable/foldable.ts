import type { Monoid } from "@principia/prelude/Monoid";

import * as A from "../Array";

/*
 * -------------------------------------------
 * Foldable Iterable
 * -------------------------------------------
 */

export const foldMapWithIndex_ = <M>(M: Monoid<M>) => <A>(fa: Iterable<A>, f: (i: number, a: A) => M): M => {
   let res = M.nat;
   let n = -1;
   const iterator = fa[Symbol.iterator]();
   // eslint-disable-next-line no-constant-condition
   while (true) {
      const result = iterator.next();
      if (result.done) {
         break;
      }
      n += 1;
      res = M.combine_(res, f(n, result.value));
   }
   return res;
};

export const foldMapWithIndex = <M>(M: Monoid<M>) => <A>(f: (i: number, a: A) => M) => (fa: Iterable<A>): M =>
   foldMapWithIndex_(M)(fa, f);

export const foldMap_ = <M>(M: Monoid<M>) => <A>(fa: Iterable<A>, f: (a: A) => M): M =>
   foldMapWithIndex_(M)(fa, (_, a) => f(a));

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Iterable<A>): M => foldMap_(M)(fa, f);

export const reduceWithIndex_ = <A, B>(fa: Iterable<A>, b: B, f: (i: number, b: B, a: A) => B): B => {
   let res = b;
   let n = -1;
   const iterator = fa[Symbol.iterator]();
   // eslint-disable-next-line no-constant-condition
   while (true) {
      const result = iterator.next();
      if (result.done) {
         break;
      }
      n += 1;
      res = f(n, res, result.value);
   }
   return res;
};

export const reduceWithIndex = <A, B>(b: B, f: (i: number, b: B, a: A) => B) => (fa: Iterable<A>): B =>
   reduceWithIndex_(fa, b, f);

export const reduce_ = <A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A) => B): B =>
   reduceWithIndex_(fa, b, (_, b, a) => f(b, a));

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Iterable<A>): B => reduce_(fa, b, f);

export const reduceRightWithIndex = <A, B>(b: B, f: (i: number, a: A, b: B) => B) => (fa: Iterable<A>): B => {
   return A.reduceRightWithIndex_(Array.from(fa), b, f);
};

export const reduceRightWithIndex_ = <A, B>(fa: Iterable<A>, b: B, f: (i: number, a: A, b: B) => B): B => {
   return A.reduceRightWithIndex_(Array.from(fa), b, f);
};
