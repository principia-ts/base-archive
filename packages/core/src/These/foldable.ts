import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { isLeft } from "./guards";
import type { These, URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable These
 * -------------------------------------------
 */

export function reduce_<E, A, B>(fa: These<E, A>, b: B, f: (b: B, a: A) => B): B {
  return isLeft(fa) ? b : f(b, fa.right);
}

export function reduce<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: These<E, A>) => B {
  return (fa) => reduce_(fa, b, f);
}

export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: These<E, A>, f: (a: A) => M) => M {
  return (fa, f) => (isLeft(fa) ? M.nat : f(fa.right));
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: These<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f);
}

export function reduceRight_<E, A, B>(fa: These<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isLeft(fa) ? b : f(fa.right, b);
}

export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: These<E, A>) => B {
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
