import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { getCompactable } from "./compactable";
import type { URI, V } from "./model";
import { traverse_ } from "./traversable";

/*
 * -------------------------------------------
 * Witherable Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * getWitherable :: Monoid e -> Witherable (Either e _)
 * ```
 *
 * Builds a `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export const getWitherable = <E>(M: P.Monoid<E>): P.Witherable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const Compactable = getCompactable(M);

   const wither_: P.WitherFn_<[URI], V_> = (G) => (wa, f) => {
      const traverseF = traverse_(G);
      return pipe(traverseF(wa, f), G.map(Compactable.compact));
   };

   const wilt_: P.WiltFn_<[URI], V_> = (G) => (wa, f) => {
      const traverseF = traverse_(G);
      return pipe(traverseF(wa, f), G.map(Compactable.separate));
   };

   return HKT.instance<P.Witherable<[URI], V_>>({
      wither_: wither_,
      wilt_: wilt_,
      wither: (G) => (f) => (wa) => wither_(G)(wa, f),
      wilt: (G) => (f) => (wa) => wilt_(G)(wa, f)
   });
};
