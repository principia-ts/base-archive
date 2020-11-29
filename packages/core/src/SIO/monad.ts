import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor, map_ } from "./functor";
import type { SIO, URI, V } from "./model";
import { ChainInstruction } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad SIO
 * -------------------------------------------
 */

export function chain_<S1, S2, R, E, A, S3, Q, D, B>(
  ma: SIO<S1, S2, R, E, A>,
  f: (a: A) => SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, B> {
  return new ChainInstruction(ma, f);
}

export function chain<A, S2, S3, Q, D, B>(
  f: (a: A) => SIO<S2, S3, Q, D, B>
): <S1, R, E>(ma: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, B> {
  return (ma) => chain_(ma, f);
}

export function tap_<S1, S2, R, E, A, S3, Q, D, B>(
  ma: SIO<S1, S2, R, E, A>,
  f: (a: A) => SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, A> {
  return chain_(ma, (a) => map_(f(a), () => a));
}

export function tap<S2, A, S3, Q, D, B>(
  f: (a: A) => SIO<S2, S3, Q, D, B>
): <S1, R, E>(ma: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, A> {
  return (ma) => tap_(ma, f);
}

export function flatten<S1, S2, R, E, A, S3, Q, D>(
  mma: SIO<S1, S2, R, E, SIO<S2, S3, Q, D, A>>
): SIO<S1, S3, Q & R, D | E, A> {
  return chain_(mma, identity);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  unit,
  flatten
});
