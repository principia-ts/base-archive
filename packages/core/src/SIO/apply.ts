import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { SIO, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply SIO
 * -------------------------------------------
 */

export function zipWith_<S1, S2, R, E, A, S3, Q, D, B, C>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): SIO<S1, S3, Q & R, D | E, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)));
}

export function zipWith<A, S2, S3, Q, D, B, C>(
  fb: SIO<S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): <S1, R, E>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, C> {
  return (fa) => zipWith_(fa, fb, f);
}

export function ap_<S1, S2, R, E, A, S3, Q, D, B>(
  fab: SIO<S1, S2, R, E, (a: A) => B>,
  fa: SIO<S2, S3, Q, D, A>
): SIO<S1, S3, Q & R, D | E, B> {
  return zipWith_(fab, fa, (f, a) => f(a));
}

export function ap<S2, S3, Q, D, A>(
  fa: SIO<S2, S3, Q, D, A>
): <S1, R, E, B>(fab: SIO<S1, S2, R, E, (a: A) => B>) => SIO<S1, S3, Q & R, D | E, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, A> {
  return zipWith_(fa, fb, (a, _) => a);
}

export function apFirst<S2, S3, Q, D, B>(
  fb: SIO<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, B> {
  return zipWith_(fa, fb, (_, b) => b);
}

export function apSecond<S2, S3, Q, D, B>(
  fb: SIO<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  zipWith_,
  zipWith
});
