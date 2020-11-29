import type { Option } from "../../../Option";
import { catchAll_ } from "../_core";
import type { AIO } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between AIO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect_<R, E, A, R1, E1, A1>(
  fa: AIO<R, E, A>,
  f: (_: unknown) => Option<AIO<R1, E1, A1>>
): AIO<R & R1, E | E1, A | A1> {
  return catchAll_(unrefineWith_(fa, f, fail), (s): AIO<R1, E | E1, A1> => s);
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between AIO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect<R1, E1, A1>(
  f: (_: unknown) => Option<AIO<R1, E1, A1>>
): <R, E, A>(fa: AIO<R, E, A>) => AIO<R & R1, E1 | E, A1 | A> {
  return (fa) => catchSomeDefect_(fa, f);
}
