import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { right } from "./constructors";
import { Functor } from "./functor";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/*
 * -------------------------------------------
 * Extend Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export function extend_<E, A, B>(wa: Either<E, A>, f: (wa: Either<E, A>) => B): Either<E, B> {
   return isLeft(wa) ? wa : right(f(wa));
}

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export function extend<E, A, B>(f: (wa: Either<E, A>) => B): (wa: Either<E, A>) => Either<E, B> {
   return (wa) => extend_(wa, f);
}

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<E, A>(wa: Either<E, A>): Either<E, Either<E, A>> {
   return extend_(wa, identity);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Extend: P.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend_,
   extend
});
