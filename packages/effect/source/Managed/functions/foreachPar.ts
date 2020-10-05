import { tuple } from "@principia/core/Function";

import * as T from "../_internal/effect";
import { parallel, sequential } from "../../ExecutionStrategy";
import { _mapEffect } from "../core";
import { Managed } from "../Managed";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar = <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => _foreachPar(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export const _foreachPar = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, readonly B[]> =>
   _mapEffect(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const makeInnerMap = T._provideSome(
         T._map(makeManagedReleaseMap(sequential()).effect, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return T._foreachPar(as, (a) =>
         T._map(
            T._chain(makeInnerMap, (innerMap) =>
               T._provideSome(f(a).effect, (u: R) => tuple(u, innerMap))
            ),
            ([_, b]) => b
         )
      );
   });
