import * as T from "../_internal/effect";
import { tuple } from "../../../Function";
import { parallel, sequential } from "../../ExecutionStrategy";
import { mapEffect_ } from "../core";
import type { Managed } from "../Managed";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const mapBothPar = <A, R1, E1, A1, B>(that: Managed<R1, E1, A1>, f: (a: A, a2: A1) => B) => <R, E>(
   self: Managed<R, E, A>
): Managed<R & R1, E | E1, B> => mapBothPar_(self, that, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const mapBothPar_ = <R, E, A, R1, E1, A1, B>(
   self: Managed<R, E, A>,
   that: Managed<R1, E1, A1>,
   f: (a: A, a2: A1) => B
): Managed<R & R1, E | E1, B> =>
   mapEffect_(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const innerMap = T.local_(makeManagedReleaseMap(sequential()).effect, (r: R & R1) =>
         tuple(r, parallelReleaseMap)
      );

      return T.chain_(T.both_(innerMap, innerMap), ([[_, l], [__, r]]) =>
         T.mapBothPar_(
            T.local_(self.effect, (_: R & R1) => tuple(_, l)),
            T.local_(that.effect, (_: R & R1) => tuple(_, r)),
            ([_, a], [__, a2]) => f(a, a2)
         )
      );
   });
