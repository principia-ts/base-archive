import type * as P from "@principia/prelude";
import { tuple } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { zipWith_ } from "./apply";
import { Functor } from "./functor";
import type { Reader, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Reader
 * -------------------------------------------
 */

export function zip_<R, A, R1, B>(
  fa: Reader<R, A>,
  fb: Reader<R1, B>
): Reader<R & R1, readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

export function zip<R1, B>(
  fb: Reader<R1, B>
): <R, A>(fa: Reader<R, A>) => Reader<R & R1, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

export function pure<A>(a: A): Reader<unknown, A> {
  return () => a;
}

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});
