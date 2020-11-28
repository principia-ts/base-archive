import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { zipWith_, zipWithSeq_ } from "./apply";
import { Functor } from "./functor";
import type { LazyPromise, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Applicative LazyPromise
 * -------------------------------------------
 */

/**
 * ```haskell
 * zip_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `LazyPromise`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip_<A, B>(fa: LazyPromise<A>, fb: LazyPromise<B>): LazyPromise<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b]);
}

/**
 * ```haskell
 * zip :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `LazyPromise`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip<B>(
  fb: LazyPromise<B>
): <A>(fa: LazyPromise<A>) => LazyPromise<readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

/**
 * ```haskell
 * zipSeq_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Sequentially applies both `LazyPromise`s and collects their results into a tuple. For a parallel version, see `both_`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipSeq_<A, B>(
  fa: LazyPromise<A>,
  fb: LazyPromise<B>
): LazyPromise<readonly [A, B]> {
  return zipWithSeq_(fa, fb, (a, b) => [a, b]);
}

/**
 * ```haskell
 * zipSeq :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Sequentially applies both `LazyPromise`s and collects their results into a tuple. For a parallel version, see `both`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipSeq<B>(
  fb: LazyPromise<B>
): <A>(fa: LazyPromise<A>) => LazyPromise<readonly [A, B]> {
  return (fa) => zipSeq_(fa, fb);
}

/**
 * ```haskell
 * pure :: a -> LazyPromise a
 * ```
 *
 * Lifts a pure value into a `LazyPromise`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): LazyPromise<A> {
  return () => Promise.resolve(a);
}

export const ApplicativePar: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_,
  zip,
  unit
});

export const ApplicativeSeq: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  zip_: zipSeq_,
  zip: zipSeq,
  unit
});
