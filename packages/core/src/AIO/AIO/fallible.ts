import * as E from "../../Either";
import { fail, succeed } from "./constructors";
import { fold_ } from "./fold";
import type { AIO } from "./model";
import { chain_ } from "./monad";

/**
 * ```haskell
 * absolve :: AIO r e (Either e1 a) -> AIO r (e | e1) a
 * ```
 *
 * Returns an AIO that submerges the error case of an `Either` into the
 * `AIO`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absolve<R, E, E1, A>(ma: AIO<R, E, E.Either<E1, A>>): AIO<R, E | E1, A> {
  return chain_(ma, E.fold(fail, succeed));
}

export function recover<R, E, A>(ma: AIO<R, E, A>): AIO<R, never, E.Either<E, A>> {
  return fold_(ma, E.left, E.right);
}
