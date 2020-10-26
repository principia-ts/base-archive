import * as T from "../_internal/effect";
import { tuple } from "../../../Function";
import { parallel, sequential } from "../../ExecutionStrategy";
import { mapTask_ } from "../core";
import type { Managed } from "../model";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar = <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => foreachPar_(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export const foreachPar_ = <R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, readonly B[]> =>
   mapTask_(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const makeInnerMap = T.local_(
         T.map_(makeManagedReleaseMap(sequential()).effect, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return T.foreachPar_(as, (a) =>
         T.map_(
            T.chain_(makeInnerMap, (innerMap) => T.local_(f(a).effect, (u: R) => tuple(u, innerMap))),
            ([_, b]) => b
         )
      );
   });
