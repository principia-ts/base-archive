import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor } from "./functor";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";

/*
 * -------------------------------------------
 * Alt Option
 * -------------------------------------------
 */
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
export function alt_<A>(fa: Option<A>, that: () => Option<A>): Option<A> {
  return isNone(fa) ? that() : fa;
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
export function alt<A>(that: () => Option<A>): (fa: Option<A>) => Option<A> {
  return (fa) => alt_(fa, that);
}

export const Alt: P.Alt<[URI], V> = HKT.instance({
  ...Functor,
  alt_,
  alt
});
