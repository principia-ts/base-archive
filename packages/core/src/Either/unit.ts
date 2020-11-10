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
export const unit: <E = never>() => Either<E, void> = () => right(undefined);
