import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { isBoth, isLeft, isRight } from "./guards";
import type { These } from "./model";

/*
 * -------------------------------------------
 * Eq These
 * -------------------------------------------
 */

export function getEq<E, A>(EE: Eq<E>, EA: Eq<A>): Eq<These<E, A>> {
  return fromEquals((x, y) =>
    isLeft(x)
      ? isLeft(y) && EE.equals_(x.left, y.left)
      : isRight(x)
      ? isRight(y) && EA.equals_(x.right, y.right)
      : isBoth(y) && EE.equals_(x.left, y.left) && EA.equals_(x.right, y.right)
  );
}
