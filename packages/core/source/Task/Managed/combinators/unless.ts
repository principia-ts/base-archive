import type { Managed } from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";
import { asUnit } from "./as";
import { suspend } from "./suspend";

/**
 * The moral equivalent of `if (!p) exp`
 */
export const unless_ = <R, E, A>(ma: Managed<R, E, A>, b: () => boolean): Managed<R, E, void> =>
   suspend(() => (b() ? unit() : asUnit(ma)));

/**
 * The moral equivalent of `if (!p) exp`
 */
export const unless = (b: () => boolean) => <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, void> => unless_(ma, b);

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export const unlessM_ = <R, E, A, R1, E1>(
   ma: Managed<R, E, A>,
   mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> => chain_(mb, (b) => (b ? unit() : asUnit(ma)));

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export const unlessM = <R1, E1>(mb: Managed<R1, E1, boolean>) => <R, E, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E | E1, void> => unlessM_(ma, mb);
