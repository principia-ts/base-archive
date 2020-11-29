import { pipe } from "../../../Function";
import * as Semaphore from "../../Semaphore";
import * as T from "../_core";
import { foreachUnitPar_ } from "./foreachUnitPar";

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN_(
  n: number
): <A, R, E>(as: Iterable<A>, f: (a: A) => T.AIO<R, E, any>) => T.AIO<R, E, void> {
  return (as, f) =>
    pipe(
      Semaphore.make(n),
      T.chain((s) => foreachUnitPar_(as, (a) => Semaphore.withPermit_(f(a), s)))
    );
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN(
  n: number
): <A, R, E>(f: (a: A) => T.AIO<R, E, any>) => (as: Iterable<A>) => T.AIO<R, E, void> {
  return (f) => (as) => foreachUnitParN_(n)(as, f);
}
