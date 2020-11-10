import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { fst } from "./destructors";
import type { Tuple, URI, V } from "./model";

export const reduce_ = <A, I, B>(fa: Tuple<A, I>, b: B, f: (b: B, a: A) => B): B => f(b, fst(fa));

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => <I>(fa: Tuple<A, I>): B => reduce_(fa, b, f);

export const foldMap_ = <M>(_M: Monoid<M>) => <A, I>(fa: Tuple<A, I>, f: (a: A) => M): M => f(fst(fa));

export const foldMap = <M>(_M: Monoid<M>) => <A>(f: (a: A) => M) => <I>(fa: Tuple<A, I>): M => foldMap_(_M)(fa, f);

export const reduceRight_ = <A, I, B>(fa: Tuple<A, I>, b: B, f: (a: A, b: B) => B): B => f(fst(fa), b);

export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => <I>(fa: Tuple<A, I>): B => reduceRight_(fa, b, f);

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_,
   reduce,
   foldMap_,
   foldMap,
   reduceRight_,
   reduceRight
});
