import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { unsafeCoerce } from "../Function";
import { make } from "./constructors";
import { map, map_ } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply Const
 * -------------------------------------------
 */

/**
 * @category Apply
 * @since 1.0.0
 */
export function getApply<E>(S: P.Semigroup<E>): P.Apply<[URI], V & HKT.Fix<"E", E>> {
  type CE = V & HKT.Fix<"E", E>;

  const ap_: P.ApFn_<[URI], CE> = (fab, fa) => make(S.combine_(fab, fa));

  const mapBoth_: P.MapBothFn_<[URI], CE> = (fa, _, __) => unsafeCoerce(fa);

  return HKT.instance<P.Apply<[URI], CE>>({
    map_: map_,
    map,
    ap_: ap_,
    ap: (fa) => (fab) => ap_(fab, fa),
    mapBoth_: mapBoth_,
    mapBoth: (fb, f) => (fa) => mapBoth_(fa, fb, f)
  });
}
