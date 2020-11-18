import * as P from "@principia/prelude";
import { pureF } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity, pipe } from "../Function";
import { left, right } from "./constructors";
import { Foldable } from "./foldable";
import { Functor } from "./functor";
import { isLeft } from "./guards";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverse_ :: (Applicative f, Traversable t) => (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<[URI], V>()((_) => (F) => {
  const pure = pureF(F);
  return (ta, f) =>
    isLeft(ta)
      ? pure(left(ta.left))
      : pipe(
          f(ta.right),
          F.map((b) => right(b))
        );
});

/**
 * ```haskell
 * traverse :: (Applicative f, Traversable t) => (a -> f b) -> t a -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[URI], V> = (F) => (f) => (ta) => traverse_(F)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[URI], V> = (F) => (ta) => traverse_(F)(ta, identity);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  ...Foldable,
  traverse_,
  sequence,
  traverse
});
