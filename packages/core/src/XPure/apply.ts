import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { URI, V, XPure } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply XPure
 * -------------------------------------------
 */

export function zipWith_<S1, S2, R, E, A, S3, Q, D, B, C>(
  fa: XPure<S1, S2, R, E, A>,
  fb: XPure<S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): XPure<S1, S3, Q & R, D | E, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)));
}

export function zipWith<A, S2, S3, Q, D, B, C>(
  fb: XPure<S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): <S1, R, E>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S3, Q & R, D | E, C> {
  return (fa) => zipWith_(fa, fb, f);
}

export function ap_<S1, S2, R, E, A, S3, Q, D, B>(
  fab: XPure<S1, S2, R, E, (a: A) => B>,
  fa: XPure<S2, S3, Q, D, A>
): XPure<S1, S3, Q & R, D | E, B> {
  return zipWith_(fab, fa, (f, a) => f(a));
}

export function ap<S2, S3, Q, D, A>(
  fa: XPure<S2, S3, Q, D, A>
): <S1, R, E, B>(fab: XPure<S1, S2, R, E, (a: A) => B>) => XPure<S1, S3, Q & R, D | E, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: XPure<S1, S2, R, E, A>,
  fb: XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, A> {
  return zipWith_(fa, fb, (a, _) => a);
}

export function apFirst<S2, S3, Q, D, B>(
  fb: XPure<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S3, Q & R, D | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: XPure<S1, S2, R, E, A>,
  fb: XPure<S2, S3, Q, D, B>
): XPure<S1, S3, Q & R, D | E, B> {
  return zipWith_(fa, fb, (_, b) => b);
}

export function apSecond<S2, S3, Q, D, B>(
  fb: XPure<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S3, Q & R, D | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  zipWith_,
  zipWith
});
