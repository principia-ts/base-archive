import { fail } from "./constructors";
import { foldM_ } from "./fold";
import type { Sink } from "./model";

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return foldM_(
    self,
    (e) => (fail(e)<I1>() as unknown) as Sink<R & R1, E | E1, I & I1, L | L1, Z1>,
    f
  );
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain<Z, R, R1, E1, I, I1 extends I, L1, Z1>(
  f: (z: Z) => Sink<R1, E1, I1, L1, Z1>
) {
  return <E, L extends I1>(self: Sink<R, E, I, L, Z>) => chain_(self, f);
}
