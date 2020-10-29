import * as P from "@principia/prelude";

import { pure } from "./applicative";
import type { IO, URI, V } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Do IO
 * -------------------------------------------
 */

export const Do: P.Do<[URI], V> = P.deriveDo(Monad);

/**
 * ```haskell
 * do :: IO {}
 * ```
 *
 * An `IO` of an empty object. Typically used at the starting point for `Do` expressions
 *
 * @category Do
 * @since 1.0.0
 */
const of: IO<{}> = pure({});
export { of as do };

export const bindS = Do.bindS;

export const letS = Do.letS;

export const bindToS = Do.bindToS;
