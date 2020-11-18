import type { Eq } from "@principia/prelude/Eq";

import type { Either } from "../Either";
import { isLeft, isRight } from "./guards";

/*
 * -------------------------------------------
 * Eq Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * getEq :: (Eq e, Eq a) -> Eq (Either a e)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export function getEq<E, A>(eqE: Eq<E>, eqA: Eq<A>): Eq<Either<E, A>> {
  const equals_ = (x: Either<E, A>, y: Either<E, A>) =>
    x === y ||
    (isLeft(x)
      ? isLeft(y) && eqE.equals_(x.left, y.left)
      : isRight(y) && eqA.equals_(x.right, y.right));
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  };
}
