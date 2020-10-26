import type { Exit } from "../../Exit";
import { unit } from "../core";
import type { Task } from "../model";
import { bracketExit_ } from "./bracket";

/**
 * ```haskell
 * _bracketOnError :: (
 *    Task r e a,
 *    (a -> Task r1 e1 b),
 *    ((a, (Exit e1 b)) -> Task r2 e2 c),
 * ) -> Task (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Same as `_bracketExit` but executes the release effect only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const bracketOnError_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   acquire: Task<R, E, A>,
   use: (a: A) => Task<R1, E1, A1>,
   release: (a: A, e: Exit<E1, A1>) => Task<R2, E2, A2>
): Task<R & R1 & R2, E | E1 | E2, A1> =>
   bracketExit_(acquire, use, (a, e) => (e._tag === "Success" ? unit : release(a, e)));

/**
 * ```haskell
 * bracketOnError :: Task t => (
 *    (a -> t x1 r1 e1 b),
 *    ((a, (Exit e1 b)) -> t x2 r2 e2 c),
 * ) -> t x r e a -> t (x | x1 | x2) (r & r1 & r2) (e | e1 | e2) b
 * ```
 *
 * Same as `bracketExit` but executes the release effect only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const bracketOnError = <A, R1, E1, A1, R2, E2, A2>(
   use: (a: A) => Task<R1, E1, A1>,
   release: (a: A, e: Exit<E1, A1>) => Task<R2, E2, A2>
) => <R, E>(acquire: Task<R, E, A>) => bracketOnError_(acquire, use, release);
