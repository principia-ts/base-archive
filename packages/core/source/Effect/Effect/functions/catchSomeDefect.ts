import type { Option } from "../../../Option";
import { catchAll_ } from "../core";
import type { Effect } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _catchSomeDefect = <R, E, A, R1, E1, A1>(
   fa: Effect<R, E, A>,
   f: (_: unknown) => Option<Effect<R1, E1, A1>>
) => catchAll_(unrefineWith_(fa, f, fail), (s): Effect<R1, E | E1, A1> => s);

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchSomeDefect = <R1, E1, A1>(f: (_: unknown) => Option<Effect<R1, E1, A1>>) => <R, E, A>(
   fa: Effect<R, E, A>
) => _catchSomeDefect(fa, f);
