import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor, mapWithIndex_ } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Extend Array
 * -------------------------------------------
 */

export function extend_<A, B>(
  wa: ReadonlyArray<A>,
  f: (as: ReadonlyArray<A>) => B
): ReadonlyArray<B> {
  return mapWithIndex_(wa, (i, _) => f(wa.slice(i)));
}

/**
 * extend :: Extend w => (w a -> b) -> w a -> w b
 */
export function extend<A, B>(
  f: (as: ReadonlyArray<A>) => B
): (wa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (wa) => extend_(wa, f);
}

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export function duplicate<A>(wa: ReadonlyArray<A>): ReadonlyArray<ReadonlyArray<A>> {
  return extend_(wa, identity);
}

export const Extend: P.Extend<[URI], V> = HKT.instance({
  ...Functor,
  extend_,
  extend
});
