import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Ord } from "@principia/prelude/Ord";

import { pipe } from "../Function";
import { keys } from "./combinators";
import { empty } from "./constructors";
import { FunctorWithIndex } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable Map
 * -------------------------------------------
 */

/**
 * @category Traversable
 * @since 1.0.0
 */
export const getTraversableWithindex = <K>(O: Ord<K>): P.TraversableWithIndex<[URI], V & HKT.Fix<"K", K>> => {
   type CK = V & HKT.Fix<"K", K>;

   const keysO = keys(O);

   const traverseWithIndex_ = P.implementTraverseWithIndex_<[URI], CK>()((_) => (G) => (ta, f) => {
      type _ = typeof _;
      let gm: HKT.HKT<_["G"], ReadonlyMap<_["K"], _["B"]>> = P.pureF(G)(empty);
      const ks = keysO(ta);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const key = ks[i];
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const a = ta.get(key)!;
         gm = pipe(
            gm,
            G.map((m) => (b: typeof _.B) => new Map(m).set(key, b)),
            P.apF(G)(f(key, a))
         );
      }
      return gm;
   });

   return HKT.instance<P.TraversableWithIndex<[URI], CK>>({
      ...FunctorWithIndex,
      traverseWithIndex_,
      traverseWithIndex: (G) => (f) => (ta) => traverseWithIndex_(G)(ta, f)
   });
};
