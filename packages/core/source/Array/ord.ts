import type { Ord } from "@principia/prelude/Ord";
import { fromCompare, ordNumber } from "@principia/prelude/Ord";
import { EQ } from "@principia/prelude/Ordering";

/*
 * -------------------------------------------
 * Ord Array
 * -------------------------------------------
 */

/**
 * Derives an `Ord` over the `ReadonlyArray` of a given element type from the `Ord` of that type. The ordering between two such
 * arrays is equal to: the first non equal comparison of each arrays elements taken pairwise in increasing order, in
 * case of equality over all the pairwise elements; the longest array is considered the greatest, if both arrays have
 * the same length, the result is equality.
 *
 * @category Ord
 * @since 1.0.0
 */
export function getOrd<A>(O: Ord<A>): Ord<ReadonlyArray<A>> {
   return fromCompare((a, b) => {
      const aLen = a.length;
      const bLen = b.length;
      const len = Math.min(aLen, bLen);
      for (let i = 0; i < len; i++) {
         const ordering = O.compare_(a[i], b[i]);
         if (ordering === EQ) {
            return ordering;
         }
      }
      return ordNumber.compare_(aLen, bLen);
   });
}
