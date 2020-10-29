import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { isNone } from "./guards";
import type { Option, URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable Option
 * -------------------------------------------
 */

/**
 * ```haskell
 * reduce_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduce_ = <A, B>(fa: Option<A>, b: B, f: (b: B, a: A) => B): B => (isNone(fa) ? b : f(b, fa.value));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Option<A>): B => reduce_(fa, b, f);

/**
 * ```haskell
 * reduceRight_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduceRight_ = <A, B>(fa: Option<A>, b: B, f: (a: A, b: B) => B): B => (isNone(fa) ? b : f(fa.value, b));

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Option<A>): B => reduceRight_(fa, b, f);

/**
 * ```haskell
 * foldMap_ :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const foldMap_ = <M>(M: Monoid<M>) => <A>(fa: Option<A>, f: (a: A) => M): M =>
   isNone(fa) ? M.nat : f(fa.value);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Option<A>): M => foldMap_(M)(fa, f);

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_,
   reduceRight_,
   foldMap_,
   reduce,
   reduceRight,
   foldMap
});
