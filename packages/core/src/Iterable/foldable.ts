import type { Monoid } from "@principia/prelude/Monoid";

import * as A from "../Array/_core";

/*
 * -------------------------------------------
 * Foldable Iterable
 * -------------------------------------------
 */

export function foldMapWithIndex_<M>(M: Monoid<M>): <A>(fa: Iterable<A>, f: (i: number, a: A) => M) => M {
   return (fa, f) => {
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
}

export function foldMapWithIndex<M>(M: Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Iterable<A>) => M {
   return (f) => (fa) => foldMapWithIndex_(M)(fa, f);
}

export function foldMap_<M>(M: Monoid<M>): <A>(fa: Iterable<A>, f: (a: A) => M) => M {
   return (fa, f) => foldMapWithIndex_(M)(fa, (_, a) => f(a));
}

export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => (fa: Iterable<A>) => M {
   return (f) => (fa) => foldMap_(M)(fa, f);
}

export function reduceWithIndex_<A, B>(fa: Iterable<A>, b: B, f: (i: number, b: B, a: A) => B): B {
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
}

export function reduceWithIndex<A, B>(b: B, f: (i: number, b: B, a: A) => B): (fa: Iterable<A>) => B {
   return (fa) => reduceWithIndex_(fa, b, f);
}

export function reduce_<A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A) => B): B {
   return reduceWithIndex_(fa, b, (_, b, a) => f(b, a));
}

export function reduce<A, B>(b: B, f: (b: B, a: A) => B): (fa: Iterable<A>) => B {
   return (fa) => reduce_(fa, b, f);
}

export function reduceRightWithIndex<A, B>(b: B, f: (i: number, a: A, b: B) => B): (fa: Iterable<A>) => B {
   return (fa) => A.reduceRightWithIndex_(Array.from(fa), b, f);
}

export function reduceRightWithIndex_<A, B>(fa: Iterable<A>, b: B, f: (i: number, a: A, b: B) => B): B {
   return A.reduceRightWithIndex_(Array.from(fa), b, f);
}
