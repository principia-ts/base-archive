import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import { catchAll_ } from "../core";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between IO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  f: (_: unknown) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return catchAll_(unrefineWith_(fa, f, fail), (s): IO<R1, E | E1, A1> => s);
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between IO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect<R1, E1, A1>(
  f: (_: unknown) => Option<IO<R1, E1, A1>>
): <R, E, A>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  return (fa) => catchSomeDefect_(fa, f);
}
