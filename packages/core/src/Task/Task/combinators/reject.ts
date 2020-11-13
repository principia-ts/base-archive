import { chain_, fail, pure } from "../_core";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Task } from "../model";
import { chain } from "../monad";

/**
 * ```haskell
 * rejectM_ :: (Task r e a, (a -> Option (Task r1 e1 e1))) -> Task (r & r1) (e | e1) a
 * ```
 *
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function rejectM_<R, E, A, R1, E1>(
   fa: Task<R, E, A>,
   pf: (a: A) => Option<Task<R1, E1, E1>>
): Task<R & R1, E | E1, A> {
   return chain_(fa, (a) => O.fold_(pf(a), () => pure(a), chain(fail)));
}

/**
 * ```haskell
 * rejectM :: (a -> Option (Task r1 e1 e1)) -> Task r e a -> Task (r & r1) (e | e1) a
 * ```
 *
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function rejectM<R1, E1, A>(
   pf: (a: A) => Option<Task<R1, E1, E1>>
): <R, E>(fa: Task<R, E, A>) => Task<R & R1, E1 | E, A> {
   return (fa) => rejectM_(fa, pf);
}

/**
 * ```haskell
 * reject_ :: (Task r e a, (a -> Option e1)) -> Task r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject_<R, E, A, E1>(fa: Task<R, E, A>, pf: (a: A) => Option<E1>): Task<R, E | E1, A> {
   return rejectM_(fa, (a) => O.map_(pf(a), fail));
}

/**
 * ```haskell
 * reject :: (a -> Option e1) -> Task r e a -> Task r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>): <R, E>(fa: Task<R, E, A>) => Task<R, E1 | E, A> {
   return (fa) => reject_(fa, pf);
}
