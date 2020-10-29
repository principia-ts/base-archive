import { pipe } from "../../../Function";
import * as Sema from "../../Semaphore";
import * as T from "../_core";
import { foreachUnitPar_ } from "./foreachUnitPar";

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachUnitParN_ = (n: number) => <A, R, E>(
   as: Iterable<A>,
   f: (a: A) => T.Task<R, E, any>
): T.Task<R, E, void> =>
   pipe(
      Sema.makeSemaphore(n),
      T.chain((s) => foreachUnitPar_(as, (a) => Sema.withPermit(s)(f(a))))
   );

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachUnitParN = (n: number) => <A, R, E>(f: (a: A) => T.Task<R, E, any>) => (
   as: Iterable<A>
): T.Task<R, E, void> => foreachUnitParN_(n)(as, f);
