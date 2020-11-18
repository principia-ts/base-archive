import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { none, some } from "./constructors";
import { Functor } from "./functor";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";

/*
 * -------------------------------------------
 * Extend Option
 * -------------------------------------------
 */
/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export function extend_<A, B>(wa: Option<A>, f: (wa: Option<A>) => B): Option<B> {
  return isNone(wa) ? none() : some(f(wa));
}

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export function extend<A, B>(f: (wa: Option<A>) => B): (wa: Option<A>) => Option<B> {
  return (wa) => extend_(wa, f);
}

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export function duplicate<A>(wa: Option<A>): Option<Option<A>> {
  return extend_(wa, identity);
}

export const Extend: P.Extend<[URI], V> = HKT.instance({
  ...Functor,
  extend_,
  extend
});
