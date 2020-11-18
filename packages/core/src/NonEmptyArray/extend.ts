import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import { Functor } from "./functor";
import type { NonEmptyArray, URI, V } from "./model";

/*
 * -------------------------------------------
 * Extend NonEmptyArray
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
export const extend_: <A, B>(
  wa: NonEmptyArray<A>,
  f: (wa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = A.extend_ as any;

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend: <A, B>(
  f: (wa: NonEmptyArray<A>) => B
) => (wa: NonEmptyArray<A>) => NonEmptyArray<B> = A.extend as any;

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const duplicate: <A>(
  wa: NonEmptyArray<A>
) => NonEmptyArray<NonEmptyArray<A>> = A.duplicate as any;

export const Extend: P.Extend<[URI], V> = HKT.instance({
  ...Functor,
  extend_,
  extend
});
