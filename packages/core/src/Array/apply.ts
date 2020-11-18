import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { flow } from "../Function";
import { Functor, map, map_ } from "./functor";
import type { URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: ReadonlyArray<(a: A) => B>, fa: ReadonlyArray<A>): ReadonlyArray<B> {
  return chain_(fab, (f) => map_(fa, f));
}

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<A>(
  fa: ReadonlyArray<A>
): <B>(fab: ReadonlyArray<(a: A) => B>) => ReadonlyArray<B> {
  return (fab) => ap_(fab, fa);
}

/**
 * ```haskell
 * apFirst_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apFirst_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  );
}

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apFirst<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return flow(
    map((a) => () => a),
    ap(fb)
  );
}

/**
 * ```haskell
 * apSecond_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  );
}

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return flow(
    map(() => (b: B) => b),
    ap(fb)
  );
}

export function zipWith_<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): ReadonlyArray<C> {
  const fc = [];
  const len = Math.min(fa.length, fb.length);
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i], fb[i]);
  }
  return fc;
}

export const mapBoth_ = zipWith_;

export function zipWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => zipWith_(fa, fb, f);
}

export const mapBoth = zipWith;

export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap,
  ap_,
  mapBoth: zipWith,
  mapBoth_: zipWith_
});
