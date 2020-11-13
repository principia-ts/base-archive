/*
 * -------------------------------------------
 * Unit Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> Array ()
 * ```
 */
export function unit(): ReadonlyArray<void> {
   return [undefined];
}
