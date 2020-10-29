import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable Identity
 * -------------------------------------------
 */

export const reduce_ = <A, B>(fa: A, b: B, f: (b: B, a: A) => B): B => f(b, fa);

export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: A): B => f(b, fa);

export const foldMap_ = <M>(_: Monoid<M>) => <A>(fa: A, f: (a: A) => M) => f(fa);

export const foldMap = <M>(_: Monoid<M>) => <A>(f: (a: A) => M) => (fa: A): M => f(fa);

export const reduceRight_ = <A, B>(fa: A, b: B, f: (a: A, b: B) => B): B => f(fa, b);

export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: A): B => f(fa, b);

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   reduce,
   foldMap_: foldMap_,
   foldMap,
   reduceRight_: reduceRight_,
   reduceRight
});
