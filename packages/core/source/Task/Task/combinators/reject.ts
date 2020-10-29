import { chain_, fail, pure } from "../_core";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Task } from "../model";

/**
 * ```haskell
 * _rejectM :: Task t => (t x r e a, (a -> Maybe t x1 r1 e1 e1)) ->
 *    t (x | x1) (r & r1) (e | e1) a
 * ```
 *
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _rejectM = <R, E, A, R1, E1>(
   fa: Task<R, E, A>,
   pf: (a: A) => Option<Task<R1, E1, E1>>
): Task<R & R1, E | E1, A> =>
   chain_(fa, (a) =>
      O.fold_(
         pf(a),
         () => pure(a),
         (e) => chain_(e, (e1) => fail(e1))
      )
   );

/**
 * ```haskell
 * rejectM :: Task t => (a -> Maybe t x1 r1 e1 e1) -> t x r e a ->
 *    t (x | x1) (r & r1) (e | e1) a
 * ```
 *
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const rejectM = <R1, E1, A>(pf: (a: A) => Option<Task<R1, E1, E1>>) => <R, E>(
   fa: Task<R, E, A>
): Task<R & R1, E | E1, A> => _rejectM(fa, pf);

/**
 * ```haskell
 * _reject :: Task t => (t x r e a, (a -> Maybe e1)) -> t x r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _reject = <R, E, A, E1>(fa: Task<R, E, A>, pf: (a: A) => Option<E1>): Task<R, E | E1, A> =>
   _rejectM(fa, (a) => O.map_(pf(a), fail));

/**
 * ```haskell
 * reject :: Task t => (a -> Maybe e1) -> t x r e a -> t x r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const reject = <A, E1>(pf: (a: A) => Option<E1>) => <R, E>(fa: Task<R, E, A>): Task<R, E | E1, A> =>
   _reject(fa, pf);
