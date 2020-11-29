import { tuple } from "../../../Function";
import { foreachParN_ as effectForeachParN } from "../../AIO/combinators/foreachParN";
import { parallelN, sequential } from "../../ExecutionStrategy";
import { mapM_ } from "../_core";
import * as T from "../_internal/aio";
import type { Managed } from "../model";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export function foreachParN(
  n: number
): <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) => Managed<R, E, readonly B[]> {
  return (f) => (as) => foreachParN_(n)(as, f);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachParN_(n: number) {
  return <R, E, A, B>(
    as: Iterable<A>,
    f: (a: A) => Managed<R, E, B>
  ): Managed<R, E, readonly B[]> =>
    mapM_(makeManagedReleaseMap(parallelN(n)), (parallelReleaseMap) => {
      const makeInnerMap = T.gives_(
        T.map_(makeManagedReleaseMap(sequential).aio, ([_, x]) => x),
        (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return effectForeachParN(n)(as, (a) =>
        T.map_(
          T.chain_(makeInnerMap, (innerMap) => T.gives_(f(a).aio, (u: R) => tuple(u, innerMap))),
          ([_, b]) => b
        )
      );
    });
}
