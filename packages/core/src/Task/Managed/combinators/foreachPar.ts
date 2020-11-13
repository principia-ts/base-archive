import { mapM_ } from "../_core";
import * as T from "../_internal/task";
import { tuple } from "../../../Function";
import { parallel, sequential } from "../../ExecutionStrategy";
import type { Managed } from "../model";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar<R, E, A, B>(
   f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, readonly B[]> {
   return (as) => foreachPar_(as, f);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export function foreachPar_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, readonly B[]> {
   return mapM_(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const makeInnerMap = T.gives_(
         T.map_(makeManagedReleaseMap(sequential()).task, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return T.foreachPar_(as, (a) =>
         T.map_(
            T.chain_(makeInnerMap, (innerMap) => T.gives_(f(a).task, (u: R) => tuple(u, innerMap))),
            ([_, b]) => b
         )
      );
   });
}
