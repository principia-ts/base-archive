import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as E from "../Either";
import { fail, succeed } from "./constructors";
import { fold_ } from "./fold";
import type { IO, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Fallible IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * absolve :: IO r e (Either e1 a) -> IO r (e | e1) a
 * ```
 *
 * Returns an `IO` that submerges an `Either` into the `IO`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absolve<R, E, E1, A>(ma: IO<R, E, E.Either<E1, A>>): IO<R, E | E1, A> {
  return chain_(ma, E.fold(fail, succeed));
}

/**
 * ```haskell
 * recover :: IO r e a -> IO r ~ (Either e a)
 * ```
 *
 * Folds an `IO` that may fail with `E` or succeed with `A` into one that never fails but succeeds with `Either<E, A>`
 */
export function recover<R, E, A>(ma: IO<R, E, A>): IO<R, never, E.Either<E, A>> {
  return fold_(ma, E.left, E.right);
}

export const Fallible: P.Fallible<[URI], V> = HKT.instance({
  absolve,
  recover,
  fail
});
