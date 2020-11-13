import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Option } from "../Option";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Unfoldable Array
 * -------------------------------------------
 */

export function unfold<A, B>(b: B, f: (b: B) => Option<readonly [A, B]>): ReadonlyArray<A> {
   const ret = [];
   let bb = b;
   /* eslint-disable-next-line no-constant-condition */
   while (true) {
      const mt = f(bb);
      if (mt._tag === "Some") {
         const [a, b] = mt.value;
         ret.push(a);
         bb = b;
      } else {
         break;
      }
   }
   return ret;
}

export const Unfoldable: P.Unfoldable<[URI], V> = HKT.instance({
   unfold
});
