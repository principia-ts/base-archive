import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import * as X from "../XPure";
import { Functor, map_ } from "./functor";
import type { IO, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad IO
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
export const chain_: <A, B>(ma: IO<A>, f: (a: A) => IO<B>) => IO<B> = X.chain_;

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
export const chain = <A, B>(f: (a: A) => IO<B>) => (ma: IO<A>): IO<B> => chain_(ma, f);

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are flipped
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind = <A>(ma: IO<A>) => <B>(f: (a: A) => IO<B>): IO<B> => chain_(ma, f);

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
export const tap_ = <A, B>(ma: IO<A>, f: (a: A) => IO<B>): IO<A> => chain_(ma, (a) => map_(f(a), () => a));

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> ma -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap = <A, B>(f: (a: A) => IO<B>) => (ma: IO<A>): IO<A> => tap_(ma, f);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `IO`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten = <A>(mma: IO<IO<A>>): IO<A> => chain_(mma, identity);

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});
