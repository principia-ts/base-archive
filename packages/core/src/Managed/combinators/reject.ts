import * as O from "../../Option";
import { fail, succeed } from "../constructors";
import type { Managed } from "../model";
import { chain, chain_ } from "../monad";

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
): Managed<R & R1, E | E1, A> {
  return chain_(ma, (a) => O.fold_(pf(a), () => succeed(a), chain(fail)));
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM<A, R1, E1>(
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => rejectM_(ma, pf);
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(
  ma: Managed<R, E, A>,
  pf: (a: A) => O.Option<E1>
): Managed<R, E | E1, A> {
  return rejectM_(ma, (a) => O.map_(pf(a), fail));
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with our held value.
 */
export function reject<A, E1>(
  pf: (a: A) => O.Option<E1>
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  return (ma) => reject_(ma, pf);
}
