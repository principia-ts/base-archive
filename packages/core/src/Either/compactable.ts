import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { left, right } from "./constructors";
import { isLeft } from "./guards";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Compactable Either
 * -------------------------------------------
 */

export const getCompactable = <E>(M: P.Monoid<E>) =>
   HKT.instance<P.Compactable<[URI], V & HKT.Fix<"E", E>>>({
      compact: (fa) => {
         return isLeft(fa) ? fa : fa.right._tag === "None" ? left(M.nat) : right(fa.right.value);
      },

      separate: (fa) => {
         return isLeft(fa)
            ? { left: fa, right: fa }
            : isLeft(fa.right)
            ? { left: right(fa.right.left), right: left(M.nat) }
            : { left: left(M.nat), right: right(fa.right.right) };
      }
   });
