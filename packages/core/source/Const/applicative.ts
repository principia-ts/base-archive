import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { make } from "./constructors";
import { Functor } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Applicative Const
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicative = <E>(M: P.Monoid<E>) =>
   HKT.instance<P.Applicative<[URI], V & HKT.Fix<"E", E>>>({
      ...Functor,
      unit: () => make(M.nat),
      both_: (fa, fb) => make(M.combine_(fa, fb)),
      both: (fb) => (fa) => make(M.combine_(fa, fb))
   });
