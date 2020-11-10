import { deriveDo } from "@principia/prelude/Do";

import { right } from "./constructors";
import type { Either } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Pipeable Do Notation for Either
 * -------------------------------------------
 */

/**
 * @category Do
 * @since 1.0.0
 */
export const Do = deriveDo(Monad);

/**
 * ```haskell
 * do :: Either _ {}
 * ```
 *
 * @category Do
 * @since 1.0.0
 */
const of: Either<never, {}> = right({});
export { of as do };

/**
 * ```haskell
 * bindS :: (Monad m, Nominal n) =>
 *   (n n3, (({ n n1: a, n n2: b, ... }) -> m c))
 *   -> m ({ n n1: a, n2: b, ... })
 *   -> m ({ n n1: a, n n2: b, ..., n n3: c })
 * ```
 *
 * Contributes a computation to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const bindS = Do.bindS;

/**
 * ```haskell
 * letS :: (Monad m, Nominal n) =>
 *   (n n3, (({ n1: a, n2: b, ... }) -> c))
 *   -> m ({ n1: a, n2: b, ... })
 *   -> m ({ n1: a, n2: b, ..., n3: c })
 * ```
 *
 * Contributes a pure value to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const letS = Do.letS;

/**
 * ```haskell
 * bindToS :: (Monad m, Nominal n) => n n1 -> m a -> m ({ n1: a })
 * ```
 *
 * Binds a computation to a property in a `Record`.
 *
 * @category Do
 * @since 1.0.0
 */
export const bindToS = Do.bindToS;
