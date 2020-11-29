import type { IO } from "../IO";
import * as X from "../SIO";
import type { LazyPromise } from "./model";

/*
 * -------------------------------------------
 * LazyPromise Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fromIO :: IO a -> LazyPromise a
 * ```
 *
 * Lifts an `IO` to a `LazyPromise`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromIO = <A>(ma: IO<A>): LazyPromise<A> => () => Promise.resolve(X.runIO(ma));

/**
 * ```haskell
 * of :: LazyPromise {}
 * ```
 *
 * A `LazyPromise` of an empty object. Typically used at the starting point for `ApplicativeDo` expressions
 *
 * @category Constructors
 * @since 1.0.0
 */
export const of: LazyPromise<{}> = () => Promise.resolve({});

/**
 * ```haskell
 * never :: LazyPromise _
 * ```
 *
 * A `LazyPromise` that never completes
 *
 * @category Constructors
 * @since 1.0.0
 */
export const never: LazyPromise<never> = () => new Promise((_) => undefined);
