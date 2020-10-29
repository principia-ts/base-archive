import type { Eq } from "@principia/prelude/Eq";
import type { Monoid } from "@principia/prelude/Monoid";
import { makeMonoid } from "@principia/prelude/Monoid";
import type { Semigroup } from "@principia/prelude/Semigroup";

import { isSome } from "../Option";
import { lookupWithKey_ } from "./combinators";
import { empty } from "./constructors";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/*
 * -------------------------------------------
 * Monoid Set
 * -------------------------------------------
 */

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<K, A>(SK: Eq<K>, SA: Semigroup<A>): Monoid<ReadonlyMap<K, A>> {
   const lookupWithKeyK_ = lookupWithKey_(SK);
   return makeMonoid<ReadonlyMap<K, A>>((mx, my) => {
      if (mx === empty) {
         return my;
      }
      if (my === empty) {
         return mx;
      }
      const r = new Map(mx);
      const entries = my.entries();
      let e: Next<readonly [K, A]>;
      while (!(e = entries.next()).done) {
         const [k, a] = e.value;
         const mxOptA = lookupWithKeyK_(mx, k);
         if (isSome(mxOptA)) {
            r.set(mxOptA.value[0], SA.combine_(mxOptA.value[1], a));
         } else {
            r.set(k, a);
         }
      }
      return r;
   }, empty);
}
