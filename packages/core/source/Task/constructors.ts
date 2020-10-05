import type { IO } from "../IO";
import type { Task } from "./Task";

/*
 * -------------------------------------------
 * Task Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fromIO :: IO a -> Task a
 * ```
 *
 * Lifts an `IO` to a `Task`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromIO = <A>(ma: IO<A>): Task<A> => () => Promise.resolve(ma());

/**
 * ```haskell
 * of :: Task {}
 * ```
 *
 * A `Task` of an empty object. Typically used at the starting point for `ApplicativeDo` expressions
 *
 * @category Constructors
 * @since 1.0.0
 */
export const of: Task<{}> = () => Promise.resolve({});

/**
 * ```haskell
 * never :: Task _
 * ```
 *
 * A `Task` that never completes
 *
 * @category Constructors
 * @since 1.0.0
 */
export const never: Task<never> = () => new Promise((_) => undefined);
