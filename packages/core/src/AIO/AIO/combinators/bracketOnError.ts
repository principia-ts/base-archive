import type { Exit } from "../../Exit";
import { unit } from "../_core";
import type { AIO } from "../model";
import { bracketExit_ } from "./bracket";

/**
 * ```haskell
 * _bracketOnError :: (
 *    AIO r e a,
 *    (a -> AIO r1 e1 b),
 *    ((a, (Exit e1 b)) -> AIO r2 e2 c),
 * ) -> AIO (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Same as `_bracketExit` but executes the release AIO only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketOnError_<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: AIO<R, E, A>,
  use: (a: A) => AIO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => AIO<R2, E2, A2>
): AIO<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, (a, e) => (e._tag === "Success" ? unit() : release(a, e)));
}

/**
 * ```haskell
 * bracketOnError :: AIO t => (
 *    (a -> t x1 r1 e1 b),
 *    ((a, (Exit e1 b)) -> t x2 r2 e2 c),
 * ) -> t x r e a -> t (x | x1 | x2) (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Same as `bracketExit` but executes the release AIO only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketOnError<A, R1, E1, A1, R2, E2, A2>(
  use: (a: A) => AIO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => AIO<R2, E2, A2>
): <R, E>(acquire: AIO<R, E, A>) => AIO<R & R1 & R2, E1 | E2 | E, A1> {
  return (acquire) => bracketOnError_(acquire, use, release);
}
