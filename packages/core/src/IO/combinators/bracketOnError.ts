import { unit } from "../_core";
import type { Exit } from "../Exit";
import type { IO } from "../model";
import { bracketExit_ } from "./bracket";

/**
 * ```haskell
 * _bracketOnError :: (
 *    IO r e a,
 *    (a -> IO r1 e1 b),
 *    ((a, (Exit e1 b)) -> IO r2 e2 c),
 * ) -> IO (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Same as `_bracketExit` but executes the release IO only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketOnError_<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: IO<R, E, A>,
  use: (a: A) => IO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, (a, e) => (e._tag === "Success" ? unit() : release(a, e)));
}

/**
 * ```haskell
 * bracketOnError :: IO t => (
 *    (a -> t x1 r1 e1 b),
 *    ((a, (Exit e1 b)) -> t x2 r2 e2 c),
 * ) -> t x r e a -> t (x | x1 | x2) (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Same as `bracketExit` but executes the release IO only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketOnError<A, R1, E1, A1, R2, E2, A2>(
  use: (a: A) => IO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => IO<R2, E2, A2>
): <R, E>(acquire: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2 | E, A1> {
  return (acquire) => bracketOnError_(acquire, use, release);
}
