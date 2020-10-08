import { tuple } from "@principia/core/Function";

import * as T from "../_internal/effect";
import { foreachParN_ as effectForeachParN } from "../../Effect/functions/foreachParN";
import { parallelN, sequential } from "../../ExecutionStrategy";
import { mapEffect_ } from "../core";
import type { Managed } from "../Managed";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN = (n: number) => <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => foreachParN_(n)(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, readonly B[]> =>
   mapEffect_(makeManagedReleaseMap(parallelN(n)), (parallelReleaseMap) => {
      const makeInnerMap = T.local_(
         T.map_(makeManagedReleaseMap(sequential()).effect, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return effectForeachParN(n)(as, (a) =>
         T.map_(
            T.chain_(makeInnerMap, (innerMap) => T.local_(f(a).effect, (u: R) => tuple(u, innerMap))),
            ([_, b]) => b
         )
      );
   });
