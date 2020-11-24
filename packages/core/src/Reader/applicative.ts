import type * as P from "@principia/prelude";
import { tuple } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { mapBoth_ } from "./apply";
import { Functor } from "./functor";
import type { Reader, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative Reader
 * -------------------------------------------
 */

export function both_<R, A, R1, B>(
  fa: Reader<R, A>,
  fb: Reader<R1, B>
): Reader<R & R1, readonly [A, B]> {
  return mapBoth_(fa, fb, tuple);
}

export function both<R1, B>(
  fb: Reader<R1, B>
): <R, A>(fa: Reader<R, A>) => Reader<R & R1, readonly [A, B]> {
  return (fa) => both_(fa, fb);
}

export function pure<A>(a: A): Reader<unknown, A> {
  return () => a;
}

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  both_,
  both,
  unit
});
