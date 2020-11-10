import type * as P from "@principia/prelude";
import { fromCombine } from "@principia/prelude";

import { mapBoth_ } from "./apply";
import { foldM_ } from "./combinators";
import { succeed } from "./constructors";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * Semigroup EIO
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: <e, a>Semigroup a -> Semigroup (IOEither e a)
 * ```
 *
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<EIO<E, A>> =>
   fromCombine((x, y) => mapBoth_(x, y, (x_, y_) => S.combine_(x_, y_)));

/**
 * ```haskell
 * getApplySemigroup :: <e, a>Semigroup a -> Semigroup (IOEither e a)
 * ```
 *
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getApplySemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<EIO<E, A>> =>
   fromCombine((x, y) =>
      foldM_(
         y,
         () => x,
         (y_) =>
            foldM_(
               x,
               () => y,
               (x_) => succeed(S.combine_(x_, y_))
            )
      )
   );
