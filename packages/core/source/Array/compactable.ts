import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import { identity } from "../Function";
import type { Option } from "../Option";
import { mapOption_ } from "./filterable";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Compactable Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * compact :: Compactable c => c (Maybe a) -> c a
 * ```
 */
export const compact = <A>(as: ReadonlyArray<Option<A>>): ReadonlyArray<A> => mapOption_(as, identity);

/**
 * ```haskell
 * separate :: Compactable c => c (Either a b) -> Separated (c a) (c b)
 * ```
 */
export const separate = <E, A>(fa: ReadonlyArray<Either<E, A>>): Separated<ReadonlyArray<E>, ReadonlyArray<A>> => {
   const len = fa.length;
   const left = [];
   const right = [];
   for (let i = 0; i < len; i++) {
      const e = fa[i];
      if (e._tag === "Left") {
         left.push(e.left);
      } else {
         right.push(e.right);
      }
   }
   return {
      left,
      right
   };
};

export const Compactable: P.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});
