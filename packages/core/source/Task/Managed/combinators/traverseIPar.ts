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
export const traverseIPar = <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => traverseIPar_(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export const traverseIPar_ = <R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, readonly B[]> =>
   mapM_(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const makeInnerMap = T.local_(
         T.map_(makeManagedReleaseMap(sequential()).task, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return T.traverseIPar_(as, (a) =>
         T.map_(
            T.chain_(makeInnerMap, (innerMap) => T.local_(f(a).task, (u: R) => tuple(u, innerMap))),
            ([_, b]) => b
         )
      );
   });
