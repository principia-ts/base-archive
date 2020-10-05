import { tuple } from "@principia/core/Function";

import * as T from "../_internal/effect";
import { parallel, sequential } from "../../ExecutionStrategy";
import { _mapEffect } from "../core";
import { Managed } from "../Managed";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const mapBothPar = <A, R1, E1, A1, B>(that: Managed<R1, E1, A1>, f: (a: A, a2: A1) => B) => <
   R,
   E
>(
   self: Managed<R, E, A>
): Managed<R & R1, E | E1, B> => _mapBothPar(self, that, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const _mapBothPar = <R, E, A, R1, E1, A1, B>(
   self: Managed<R, E, A>,
   that: Managed<R1, E1, A1>,
   f: (a: A, a2: A1) => B
): Managed<R & R1, E | E1, B> =>
   _mapEffect(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const innerMap = T._provideSome(makeManagedReleaseMap(sequential()).effect, (r: R & R1) =>
         tuple(r, parallelReleaseMap)
      );

      return T._chain(T._both(innerMap, innerMap), ([[_, l], [__, r]]) =>
         T._bothMapPar(
            T._provideSome(self.effect, (_: R & R1) => tuple(_, l)),
            T._provideSome(that.effect, (_: R & R1) => tuple(_, r)),
            ([_, a], [__, a2]) => f(a, a2)
         )
      );
   });
