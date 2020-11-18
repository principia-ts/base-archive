import type { Show } from "@principia/prelude/Show";

import { isLeft } from "./guards";
import type { Either } from "./model";

/*
 * -------------------------------------------
 * Show Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * getShow :: (Show e, Show a) -> Show (Either e a)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export function getShow<E, A>(showE: Show<E>, showA: Show<A>): Show<Either<E, A>> {
  return {
    show: (fa) => (isLeft(fa) ? `left(${showE.show(fa.left)})` : `right(${showA.show(fa.right)})`)
  };
}
