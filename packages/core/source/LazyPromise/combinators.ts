import type { FunctionN } from "../Function";
import type { IO } from "../IO";
import { fromIO } from "./constructors";
import type { LazyPromise } from "./model";
import { chain } from "./monad";

/*
 * -------------------------------------------
 * LazyPromise Combinators
 * -------------------------------------------
 */

/**
 * ```haskell
 * delay_ :: (LazyPromise a, Number) -> LazyPromise a
 * ```
 *
 * Delays a `LazyPromise` by the provided number of milliseconds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const delay_ = <A>(ma: LazyPromise<A>, ms: number): LazyPromise<A> => () =>
   new Promise((resolve) => {
      setTimeout(() => {
         ma().then(resolve);
      }, ms);
   });

/**
 * ```haskell
 * delay :: Number -> LazyPromise a -> LazyPromise a
 * ```
 *
 * Delays a `LazyPromise` by the provided number of milliseconds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const delay = (ms: number) => <A>(ma: LazyPromise<A>): LazyPromise<A> => delay_(ma, ms);

/**
 * ```haskell
 * fromIOK :: ((a, b, ...) -> IO c) -> ((a, b, ...) -> LazyPromise c)
 * ```
 *
 * Lifts an uncurried, n-ary function returning an `IO` to one that returns a `LazyPromise`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fromIOK = <A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, IO<B>>): FunctionN<A, LazyPromise<B>> => (
   ...a
) => fromIO(f(...a));

/**
 * ```haskell
 * chainIOK :: (a -> IO b) -> LazyPromise a -> LazyPromise b
 * ```
 *
 * Lifts a unary function that takes an `a` and returns an `IO b` to one that takes a `LazyPromise a` and returns a `LazyPromise b`
 * @category Combinators
 * @since 1.0.0
 */
export const chainIOK = <A, B>(f: (a: A) => IO<B>): ((ma: LazyPromise<A>) => LazyPromise<B>) => chain(fromIOK(f));
