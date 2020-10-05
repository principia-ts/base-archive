import { Eq } from "../Eq";
import * as Mb from "../Maybe";
import { lookupWithKey } from "./combinators";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * Test whether or not one `Map` contains all of the keys and values contained in another `Map`
 *
 * @since 1.0.0
 */
export const _isSubmap = <K, A>(EK: Eq<K>, EA: Eq<A>) => {
   const lookupWithKeyE = lookupWithKey(EK);
   return (me: ReadonlyMap<K, A>, that: ReadonlyMap<K, A>) => {
      const entries = me.entries();
      let e: Next<readonly [K, A]>;
      while (!(e = entries.next()).done) {
         const [k, a] = e.value;
         const d2OptA = lookupWithKeyE(k)(that);
         if (
            Mb.isNothing(d2OptA) ||
            !EK.equals(k)(d2OptA.value[0]) ||
            !EA.equals(a)(d2OptA.value[1])
         ) {
            return false;
         }
      }
      return true;
   };
};

export const isSubmap = <K, A>(EK: Eq<K>, EA: Eq<A>) => {
   const _isSubmapKA = _isSubmap(EK, EA);
   return (that: ReadonlyMap<K, A>) => (me: ReadonlyMap<K, A>) => _isSubmapKA(me, that);
};
