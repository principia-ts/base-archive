import type * as P from "@principia/prelude";
import { tuple } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { zipWith_ } from "./apply";
import { Functor } from "./functor";
import type { State, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Apply State
 * -------------------------------------------
 */

export function zip_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

export function zip<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

export function pure<S = never, A = never>(a: A): State<S, A> {
  return (s) => [a, s];
}

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});
