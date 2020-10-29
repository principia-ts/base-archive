import type { Show } from "@principia/prelude/Show";

/*
 * -------------------------------------------
 * Show Map
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getShow = <K, A>(SK: Show<K>, SA: Show<A>): Show<ReadonlyMap<K, A>> => ({
   show: (m) => {
      let elements = "";
      m.forEach((a, k) => {
         elements += `[${SK.show(k)}, ${SA.show(a)}], `;
      });
      if (elements !== "") {
         elements = elements.substring(0, elements.length - 2);
      }
      return `Map([${elements}])`;
   }
});
