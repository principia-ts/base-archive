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
export const extend_ = <A, B>(wa: Option<A>, f: (wa: Option<A>) => B): Option<B> => (isNone(wa) ? none() : some(f(wa)));

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend = <A, B>(f: (wa: Option<A>) => B) => (wa: Option<A>): Option<B> => extend_(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export const duplicate = <A>(wa: Option<A>): Option<Option<A>> => extend_(wa, identity);

export const Extend: P.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
});
