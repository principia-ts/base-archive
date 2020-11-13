import type { ExecutionStrategy } from "../../ExecutionStrategy";
import type { Managed } from "../model";
import { foreach_ } from "./foreach";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec_<R, E, A, B>(
   es: ExecutionStrategy,
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, ReadonlyArray<B>> {
   switch (es._tag) {
      case "Sequential": {
         return foreach_(as, f);
      }
      case "Parallel": {
         return foreachPar_(as, f);
      }
      case "ParallelN": {
         return foreachParN_(es.n)(as, f);
      }
   }
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec(
   es: ExecutionStrategy
): <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) => Managed<R, E, ReadonlyArray<B>> {
   return (f) => (as) => foreachExec_(es, as, f) as any;
}
