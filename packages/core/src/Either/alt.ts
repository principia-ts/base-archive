import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor } from "./functor";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E, A, G>(fa: Either<E, A>, that: () => Either<G, A>): Either<E | G, A> {
   return isLeft(fa) ? that() : fa;
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<G, A>(that: () => Either<G, A>): <E>(fa: Either<E, A>) => Either<G | E, A> {
   return (fa) => alt_(fa, that);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});
