import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor, map_ } from "./functor";
import type { LazyPromise, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad LazyPromise
 * -------------------------------------------
 */

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_ = <A, B>(ma: LazyPromise<A>, f: (a: A) => LazyPromise<B>): LazyPromise<B> => () =>
   ma().then((a) => f(a)());

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain = <A, B>(f: (a: A) => LazyPromise<B>) => (ma: LazyPromise<A>): LazyPromise<B> => chain_(ma, f);

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap_ = <A, B>(ma: LazyPromise<A>, f: (a: A) => LazyPromise<B>): LazyPromise<A> =>
   chain_(ma, (a) => map_(f(a), () => a));

/**
 * ```haskell
 * tap :: Monad m => (a -> mb) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap = <A, B>(f: (a: A) => LazyPromise<B>) => (ma: LazyPromise<A>): LazyPromise<A> => tap_(ma, f);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `LazyPromise`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten = <A>(mma: LazyPromise<LazyPromise<A>>): LazyPromise<A> => chain_(mma, identity);

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});
