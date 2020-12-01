import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable Identity
 * -------------------------------------------
 */

export function reduce_<A, B>(fa: A, b: B, f: (b: B, a: A) => B): B {
  return f(b, fa);
}

export function reduce<A, B>(b: B, f: (b: B, a: A) => B): (fa: A) => B {
  return (fa) => f(b, fa);
}

export function foldMap_<M>(_: Monoid<M>): <A>(fa: A, f: (a: A) => M) => M {
  return (fa, f) => f(fa);
}

export function foldMap<M>(_: Monoid<M>): <A>(f: (a: A) => M) => (fa: A) => M {
  return (f) => (fa) => f(fa);
}

export function reduceRight_<A, B>(fa: A, b: B, f: (a: A, b: B) => B): B {
  return f(fa, b);
}

export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B): (fa: A) => B {
  return (fa) => f(fa, b);
}

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
  reduce_,
  reduce,
  foldMap_,
  foldMap,
  reduceRight_,
  reduceRight
});
