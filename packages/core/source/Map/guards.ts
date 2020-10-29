import type { Eq } from "@principia/prelude/Eq";

import * as O from "../Option";
import { lookupWithKey } from "./combinators";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * Test whether or not a map is empty
 */
export const isEmpty = <K, A>(d: ReadonlyMap<K, A>): boolean => d.size === 0;

/**
 * Test whether or not one `Map` contains all of the keys and values contained in another `Map`
 *
 * @since 1.0.0
 */
export const isSubmap_ = <K, A>(EK: Eq<K>, EA: Eq<A>) => {
   const lookupWithKeyE = lookupWithKey(EK);
   return (me: ReadonlyMap<K, A>, that: ReadonlyMap<K, A>) => {
      const entries = me.entries();
      let e: Next<readonly [K, A]>;
      while (!(e = entries.next()).done) {
         const [k, a] = e.value;
         const d2OptA = lookupWithKeyE(k)(that);
         if (O.isNone(d2OptA) || !EK.equals_(k, d2OptA.value[0]) || !EA.equals_(a, d2OptA.value[1])) {
            return false;
         }
      }
      return true;
   };
};

export const isSubmap = <K, A>(EK: Eq<K>, EA: Eq<A>) => {
   const isSubmapKA_ = isSubmap_(EK, EA);
   return (that: ReadonlyMap<K, A>) => (me: ReadonlyMap<K, A>) => isSubmapKA_(me, that);
};
