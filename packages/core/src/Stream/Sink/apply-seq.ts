import { tuple } from "../../Function";
import { map_ } from "./functor";
import type { Sink } from "./model";
import { chain_ } from "./monad";

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1, Z2>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, E | E1, I & I1, L | L1, Z2> {
  return chain_(fa, (z) => map_(fb, (_) => f(z, _)));
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith<R1, E1, I, I1 extends I, L1, Z, Z1, Z2>(
  fb: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E, L extends I1>(fa: Sink<R, E, I, L, Z>) => zipWith_(fa, fb, f);
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return zipWith_(fa, fb, tuple);
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(
  fa: Sink<R, E, I, L, Z>
) => Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return (fa) => zip_(fa, fb);
}

export function apFirst_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return zipWith_(fa, fb, (z, _) => z);
}

export function apFirst<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  fa: Sink<R, E, I, L, Z>,
  fb: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return zipWith_(fa, fb, (_, z1) => z1);
}

export function apSecond<I, R1, E1, I1 extends I, L1, Z1>(
  fb: Sink<R1, E1, I1, L1, Z1>
): <R, E, L extends I1, Z>(fa: Sink<R, E, I, L, Z>) => Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return (fa) => apSecond_(fa, fb);
}
