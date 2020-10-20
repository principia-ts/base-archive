import type { FunctionN } from "../Function";
import type { IO } from "../IO";
import { fromIO } from "./constructors";
import { chain } from "./methods";
import type { Task } from "./model";

/*
 * -------------------------------------------
 * Task Combinators
 * -------------------------------------------
 */

/**
 * ```haskell
 * delay_ :: (Task a, Number) -> Task a
 * ```
 *
 * Delays a `Task` by the provided number of milliseconds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const delay_ = <A>(ma: Task<A>, ms: number): Task<A> => () =>
   new Promise((resolve) => {
      setTimeout(() => {
         ma().then(resolve);
      }, ms);
   });

/**
 * ```haskell
 * delay :: Number -> Task a -> Task a
 * ```
 *
 * Delays a `Task` by the provided number of milliseconds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const delay = (ms: number) => <A>(ma: Task<A>): Task<A> => delay_(ma, ms);

/**
 * ```haskell
 * fromIOK :: ((a, b, ...) -> IO c) -> ((a, b, ...) -> Task c)
 * ```
 *
 * Lifts an uncurried, n-ary function returning an `IO` to one that returns a `Task`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fromIOK = <A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, IO<B>>): FunctionN<A, Task<B>> => (...a) =>
   fromIO(f(...a));

/**
 * ```haskell
 * chainIOK :: (a -> IO b) -> Task a -> Task b
 * ```
 *
 * Lifts a unary function that takes an `a` and returns an `IO b` to one that takes a `Task a` and returns a `Task b`
 * @category Combinators
 * @since 1.0.0
 */
export const chainIOK = <A, B>(f: (a: A) => IO<B>): ((ma: Task<A>) => Task<B>) => chain(fromIOK(f));
