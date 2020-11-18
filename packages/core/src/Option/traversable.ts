import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { none, some } from "./constructors";
import { Functor } from "./functor";
import { isNone } from "./guards";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable Option
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverse_ :: (Applicative f, Traversable t) => Instance f -> (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[URI], V> = (G) => (ta, f) =>
  isNone(ta) ? G.map_(G.unit(), () => none()) : pipe(f(ta.value), G.map(some));

/**
 * ```haskell
 * traverse :: (Applicative f, Traversable t) => Instance f -> (a -> f b) -> t a -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[URI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => Instance f -> t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[URI], V> = (G) => (fa) =>
  isNone(fa) ? G.map_(G.unit(), () => none()) : pipe(fa.value, G.map(some));

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
});
