import { right } from "./constructors";
import type { Either } from "./model";

/*
 * -------------------------------------------
 * Unit Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> Either _ ()
 * ```
 */
export function unit<E = never>(): Either<E, void> {
  return right(undefined);
}
