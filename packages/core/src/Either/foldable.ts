import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * reduce_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export function reduce_<E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B {
   return isLeft(fa) ? b : f(b, fa.right);
}

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export function reduce<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: Either<E, A>) => B {
   return (fa) => reduce_(fa, b, f);
}

/**
 * ```haskell
 * foldMap_ :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: Either<E, A>, f: (a: A) => M) => M {
   return (fa, f) => (isLeft(fa) ? M.nat : f(fa.right));
}

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M {
   return (f) => (fa) => foldMap_(M)(fa, f);
}

/**
 * ```haskell
 * reduceRight_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export function reduceRight_<E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B {
   return isLeft(fa) ? b : f(fa.right, b);
}

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: Either<E, A>) => B {
   return (fa) => reduceRight_(fa, b, f);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_,
   foldMap_,
   reduceRight_,
   reduce,
   foldMap,
   reduceRight
});
