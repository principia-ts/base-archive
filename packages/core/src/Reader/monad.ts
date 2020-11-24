import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { Reader, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Reader
 * -------------------------------------------
 */

export function chain_<R, A, R1, B>(
  ma: Reader<R, A>,
  f: (a: A) => Reader<R1, B>
): Reader<R & R1, B> {
  return (r) => f(ma(r))(r);
}

export function chain<A, R1, B>(
  f: (a: A) => Reader<R1, B>
): <R>(ma: Reader<R, A>) => Reader<R & R1, B> {
  return (ma) => chain_(ma, f);
}

export function flatten<R, R1, A>(mma: Reader<R, Reader<R1, A>>): Reader<R & R1, A> {
  return (r) => mma(r)(r);
}

export function tap_<R, A, R1, B>(ma: Reader<R, A>, f: (a: A) => Reader<R1, B>): Reader<R & R1, A> {
  return (r) => chain_(ma, (a) => map_(f(a), () => a))(r);
}

export function tap<A, R1, B>(
  f: (a: A) => Reader<R1, B>
): <R>(ma: Reader<R, A>) => Reader<R & R1, A> {
  return (ma) => tap_(ma, f);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  flatten,
  unit
});
