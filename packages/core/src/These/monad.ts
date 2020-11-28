import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { both, left } from "./constructors";
import { Functor } from "./functor";
import type { URI } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad These
 * -------------------------------------------
 */

export function getMonad<E>(SE: P.Semigroup<E>): P.MonadFail<[URI], HKT.Fix<"E", E>> {
  const flatten: P.FlattenFn<[URI], HKT.Fix<"E", E>> = (mma) => {
    switch (mma._tag) {
      case "Left": {
        return mma;
      }
      case "Right": {
        return mma.right;
      }
      case "Both": {
        const { left: l, right: r } = mma;
        switch (r._tag) {
          case "Left": {
            return left(SE.combine_(l, r.left));
          }
          case "Right": {
            return both(l, r.right);
          }
          case "Both": {
            return both(SE.combine_(l, r.left), r.right);
          }
        }
      }
    }
  };

  return HKT.instance<P.MonadFail<[URI], HKT.Fix<"E", E>>>({
    ...Functor,
    unit,
    flatten,
    fail: left as any
  });
}
