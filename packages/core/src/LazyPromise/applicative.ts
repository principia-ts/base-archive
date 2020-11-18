import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { mapBoth_, mapBothSeq_ } from "./apply";
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
 * both_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `LazyPromise`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export function both_<A, B>(fa: LazyPromise<A>, fb: LazyPromise<B>): LazyPromise<readonly [A, B]> {
  return mapBoth_(fa, fb, (a, b) => [a, b]);
}

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `LazyPromise`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export function both<B>(
  fb: LazyPromise<B>
): <A>(fa: LazyPromise<A>) => LazyPromise<readonly [A, B]> {
  return (fa) => both_(fa, fb);
}

/**
 * ```haskell
 * bothSeq_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Sequentially applies both `LazyPromise`s and collects their results into a tuple. For a parallel version, see `both_`
 *
 * @category Apply
 * @since 1.0.0
 */
export function bothSeq_<A, B>(
  fa: LazyPromise<A>,
  fb: LazyPromise<B>
): LazyPromise<readonly [A, B]> {
  return mapBothSeq_(fa, fb, (a, b) => [a, b]);
}

/**
 * ```haskell
 * bothSeq :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Sequentially applies both `LazyPromise`s and collects their results into a tuple. For a parallel version, see `both`
 *
 * @category Apply
 * @since 1.0.0
 */
export function bothSeq<B>(
  fb: LazyPromise<B>
): <A>(fa: LazyPromise<A>) => LazyPromise<readonly [A, B]> {
  return (fa) => bothSeq_(fa, fb);
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
  both_,
  both,
  unit
});

export const ApplicativeSeq: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  both_: bothSeq_,
  both: bothSeq,
  unit
});
