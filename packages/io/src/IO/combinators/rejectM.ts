import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import * as O from "@principia/base/data/Option";

import { fail, flatMap, flatMap_, pure } from "../core";

/**
 * ```haskell
 * rejectM_ :: (IO r e a, (a -> Option (IO r1 e1 e1))) -> IO (r & r1) (e | e1) a
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
  fa: IO<R, E, A>,
  pf: (a: A) => Option<IO<R1, E1, E1>>
): IO<R & R1, E | E1, A> {
  return flatMap_(fa, (a) => O.fold_(pf(a), () => pure(a), flatMap(fail)));
}

/**
 * ```haskell
 * rejectM :: (a -> Option (IO r1 e1 e1)) -> IO r e a -> IO (r & r1) (e | e1) a
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
  pf: (a: A) => Option<IO<R1, E1, E1>>
): <R, E>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (fa) => rejectM_(fa, pf);
}
