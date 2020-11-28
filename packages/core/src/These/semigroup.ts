import type { Semigroup } from "@principia/prelude";
import { fromCombine } from "@principia/prelude";

import { both, left, right } from "./constructors";
import { isLeft, isRight } from "./guards";
import type { These } from "./model";

/*
 * -------------------------------------------
 * Semigroup These
 * -------------------------------------------
 */

export function getSemigroup<E, A>(SE: Semigroup<E>, SA: Semigroup<A>): Semigroup<These<E, A>> {
  return fromCombine((x, y) =>
    isLeft(x)
      ? isLeft(y)
        ? left(SE.combine_(x.left, y.left))
        : isRight(y)
        ? both(x.left, y.right)
        : both(SE.combine_(x.left, y.left), y.right)
      : isRight(x)
      ? isLeft(y)
        ? both(y.left, x.right)
        : isRight(y)
        ? right(SA.combine_(x.right, y.right))
        : both(y.left, SA.combine_(x.right, y.right))
      : isLeft(y)
      ? both(SE.combine_(x.left, y.left), x.right)
      : isRight(y)
      ? both(x.left, SA.combine_(x.right, y.right))
      : both(SE.combine_(x.left, y.left), SA.combine_(x.right, y.right))
  );
}
