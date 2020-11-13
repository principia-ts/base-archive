import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Ord } from "@principia/prelude/Ord";

import { pipe } from "../Function";
import { compact, separate } from "./compactable";
import type { URI, V } from "./model";
import { getTraversableWithindex } from "./traversable";

/*
 * -------------------------------------------
 * Witherable Map
 * -------------------------------------------
 */

/**
 * @category Witherable
 * @since 1.0.0
 */
export function getWitherable<K>(O: Ord<K>): P.WitherableWithIndex<[URI], V & HKT.Fix<"K", K>> {
   type CK = V & HKT.Fix<"K", K>;

   const { traverseWithIndex_ } = getTraversableWithindex(O);

   const witherWithIndex_ = P.implementWitherWithIndex_<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(traverseWithIndex_(G)(wa, f), G.map(compact))
   );

   const wiltWithIndex_ = P.implementWiltWithIndex_<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(traverseWithIndex_(G)(wa, f), G.map(separate))
   );

   return HKT.instance<P.WitherableWithIndex<[URI], CK>>({
      wiltWithIndex_: wiltWithIndex_,
      witherWithIndex_: witherWithIndex_,
      wiltWithIndex: (G) => (f) => (wa) => wiltWithIndex_(G)(wa, f),
      witherWithIndex: (G) => (f) => (wa) => witherWithIndex_(G)(wa, f)
   });
}
