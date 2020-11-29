import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { chain_, fail, pure } from "../_core";
import type { AIO } from "../model";
import { chain } from "../monad";

/**
 * ```haskell
 * rejectM_ :: (AIO r e a, (a -> Option (AIO r1 e1 e1))) -> AIO (r & r1) (e | e1) a
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
  fa: AIO<R, E, A>,
  pf: (a: A) => Option<AIO<R1, E1, E1>>
): AIO<R & R1, E | E1, A> {
  return chain_(fa, (a) => O.fold_(pf(a), () => pure(a), chain(fail)));
}

/**
 * ```haskell
 * rejectM :: (a -> Option (AIO r1 e1 e1)) -> AIO r e a -> AIO (r & r1) (e | e1) a
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
  pf: (a: A) => Option<AIO<R1, E1, E1>>
): <R, E>(fa: AIO<R, E, A>) => AIO<R & R1, E1 | E, A> {
  return (fa) => rejectM_(fa, pf);
}

/**
 * ```haskell
 * reject_ :: (AIO r e a, (a -> Option e1)) -> AIO r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject_<R, E, A, E1>(
  fa: AIO<R, E, A>,
  pf: (a: A) => Option<E1>
): AIO<R, E | E1, A> {
  return rejectM_(fa, (a) => O.map_(pf(a), fail));
}

/**
 * ```haskell
 * reject :: (a -> Option e1) -> AIO r e a -> AIO r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject<A, E1>(
  pf: (a: A) => Option<E1>
): <R, E>(fa: AIO<R, E, A>) => AIO<R, E1 | E, A> {
  return (fa) => reject_(fa, pf);
}
