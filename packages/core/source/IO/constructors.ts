import type { IO } from "./IO";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * of :: IO {}
 * ```
 *
 * An `IO` of an empty object. Typically used at the starting point for `ApplicativeDo` expressions
 *
 * @category Constructors
 * @since 1.0.0
 */
export const of: IO<{}> = () => ({});
