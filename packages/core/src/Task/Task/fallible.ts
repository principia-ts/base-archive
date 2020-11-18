import * as E from "../../Either";
import { fail, succeed } from "./constructors";
import { fold_ } from "./fold";
import type { Task } from "./model";
import { chain_ } from "./monad";

/**
 * ```haskell
 * absolve :: Task r e (Either e1 a) -> Task r (e | e1) a
 * ```
 *
 * Returns a task that submerges the error case of an `Either` into the
 * `Task`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absolve<R, E, E1, A>(ma: Task<R, E, E.Either<E1, A>>): Task<R, E | E1, A> {
  return chain_(ma, E.fold(fail, succeed));
}

export function recover<R, E, A>(ma: Task<R, E, A>): Task<R, never, E.Either<E, A>> {
  return fold_(ma, E.left, E.right);
}
