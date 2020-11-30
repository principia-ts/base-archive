import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, b, a) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function reduceWithIndex_<A, B>(
  fa: ReadonlyArray<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
): B {
  const len = fa.length;
  let r = b;
  for (let i = 0; i < len; i++) {
    r = f(i, r, fa[i]);
  }
  return r;
}

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function reduceWithIndex<A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
): (fa: ReadonlyArray<A>) => B {
  return (fa) => reduceWithIndex_(fa, b, f);
}

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function reduce_<A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B {
  return reduceWithIndex_(fa, b, (_, b, a) => f(b, a));
}

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function reduce<A, B>(b: B, f: (b: B, a: A) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a));
}

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function reduceRightWithIndex_<A, B>(
  fa: ReadonlyArray<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
): B {
  let r = b;
  for (let i = fa.length - 1; i >= 0; i--) {
    r = f(i, fa[i], r);
  }
  return r;
}

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
): (fa: ReadonlyArray<A>) => B {
  return (fa) => reduceRightWithIndex_(fa, b, f);
}

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function reduceRight_<A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): B {
  return reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b));
}

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => reduceRight_(fa, b, f);
}

/**
 * ```haskell
 * foldMapWithIndex_ :: (Monoid m, FoldableWithIndex f, Index k) =>
 *    m b -> (f a, ((k, a) -> b) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function foldMapWithIndex_<M>(
  M: Monoid<M>
): <A>(fa: ReadonlyArray<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => reduceWithIndex_(fa, M.nat, (i, b, a) => M.combine_(b, f(i, a)));
}

/**
 * ```haskell
 * foldMapWithIndex :: (Monoid m, FoldableWithIndex f, Index k) =>
 *    m b -> ((k, a) -> b) -> f a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <A>(f: (i: number, a: A) => M) => (fa: ReadonlyArray<A>) => M {
  return (f) => (fa) => foldMapWithIndex_(M)(fa, f);
}

/**
 * ```haskell
 * foldMap_ :: (Monoid m, Foldable f) =>
 *    m b -> (f a, (a -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<M>(M: Monoid<M>): <A>(fa: ReadonlyArray<A>, f: (a: A) => M) => M {
  const foldMapWithIndexM_ = foldMapWithIndex_(M);
  return (fa, f) => foldMapWithIndexM_(fa, (_, a) => f(a));
}

/**
 * ```haskell
 * foldMap :: (Monoid m, Foldable f) => m b -> (a -> b) -> f a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f);
}

/**
 * ```haskell
 * fold :: (Monoid m, Foldable f) => m a -> f a -> a
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function fold<M>(M: Monoid<M>): (fa: ReadonlyArray<M>) => M {
  return (fa) => reduceWithIndex_(fa, M.nat, (_, b, a) => M.combine_(b, a));
}

export const FoldableWithIndex: P.FoldableWithIndex<[URI], V> = HKT.instance({
  reduceWithIndex_,
  reduceWithIndex,
  reduceRightWithIndex,
  reduceRightWithIndex_,
  foldMapWithIndex,
  foldMapWithIndex_
});

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
  reduce_,
  reduce,
  reduceRight_,
  reduceRight,
  foldMap_,
  foldMap
});
