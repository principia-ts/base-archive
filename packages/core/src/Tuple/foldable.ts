import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { fst } from "./destructors";
import type { Tuple, URI, V } from "./model";

export function reduce_<A, I, B>(fa: Tuple<A, I>, b: B, f: (b: B, a: A) => B): B {
   return f(b, fst(fa));
}

export function reduce<A, B>(b: B, f: (b: B, a: A) => B): <I>(fa: Tuple<A, I>) => B {
   return (fa) => reduce_(fa, b, f);
}

export function foldMap_<M>(_M: Monoid<M>): <A, I>(fa: Tuple<A, I>, f: (a: A) => M) => M {
   return (fa, f) => f(fst(fa));
}

export function foldMap<M>(_M: Monoid<M>): <A>(f: (a: A) => M) => <I>(fa: Tuple<A, I>) => M {
   return (f) => (fa) => foldMap_(_M)(fa, f);
}

export function reduceRight_<A, I, B>(fa: Tuple<A, I>, b: B, f: (a: A, b: B) => B): B {
   return f(fst(fa), b);
}

export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B): <I>(fa: Tuple<A, I>) => B {
   return (fa) => reduceRight_(fa, b, f);
}

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_,
   reduce,
   foldMap_,
   foldMap,
   reduceRight_,
   reduceRight
});
