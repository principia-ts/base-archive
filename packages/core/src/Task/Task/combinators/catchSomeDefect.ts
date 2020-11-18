import { catchAll_ } from "../_core";
import type { Option } from "../../../Option";
import type { Task } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Task and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect_<R, E, A, R1, E1, A1>(
  fa: Task<R, E, A>,
  f: (_: unknown) => Option<Task<R1, E1, A1>>
): Task<R & R1, E | E1, A | A1> {
  return catchAll_(unrefineWith_(fa, f, fail), (s): Task<R1, E | E1, A1> => s);
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Task and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect<R1, E1, A1>(
  f: (_: unknown) => Option<Task<R1, E1, A1>>
): <R, E, A>(fa: Task<R, E, A>) => Task<R & R1, E1 | E, A1 | A> {
  return (fa) => catchSomeDefect_(fa, f);
}
