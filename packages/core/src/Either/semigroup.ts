import type * as P from "@principia/prelude";

import type { Either } from "../Either";
import { right } from "./constructors";
import { isLeft } from "./guards";

/*
 * -------------------------------------------
 * Semigroup Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_: P.CombineFn_<Either<E, A>> = (x, y) =>
    isLeft(y) ? x : isLeft(x) ? y : right(S.combine_(x.right, y.right));
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  };
}

/**
 * ```haskell
 * getApplySemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getApplySemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_ = (x: Either<E, A>, y: Either<E, A>) =>
    isLeft(y) ? y : isLeft(x) ? x : right(S.combine_(x.right, y.right));
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  };
}
