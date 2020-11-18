import type { NonEmptyArray } from "./model";

/*
 * -------------------------------------------
 * Unit NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> NonEmptyArray ()
 * ```
 *
 * @category Unit
 * @since 1.0.0
 */
export function unit(): NonEmptyArray<void> {
  return [undefined];
}
