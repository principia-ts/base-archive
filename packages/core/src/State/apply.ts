import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor } from "./functor";
import type { State, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply State
 * -------------------------------------------
 */

export function zipWith_<S, A, B, C>(
  fa: State<S, A>,
  fb: State<S, B>,
  f: (a: A, b: B) => C
): State<S, C> {
  return (s) => {
    const [a, s1] = fa(s);
    const [b, s2] = fb(s1);
    return [f(a, b), s2];
  };
}

export function zipWith<S, A, B, C>(
  fb: State<S, B>,
  f: (a: A, b: B) => C
): (fa: State<S, A>) => State<S, C> {
  return (fa) => zipWith_(fa, fb, f);
}

export function ap_<S, A, B>(fab: State<S, (a: A) => B>, fa: State<S, A>): State<S, B> {
  return zipWith_(fab, fa, (f, a) => f(a));
}

export function ap<S, A>(fa: State<S, A>): <B>(fab: State<S, (a: A) => B>) => State<S, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, A> {
  return zipWith_(fa, fb, (a, _) => a);
}

export function apFirst<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, B> {
  return zipWith_(fa, fb, (_, b) => b);
}

export function apSecond<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, B> {
  return (fa) => apSecond_(fa, fb);
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  zipWith_,
  zipWith,
  ap_,
  ap
});
