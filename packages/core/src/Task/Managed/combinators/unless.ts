import type { Managed } from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";
import { asUnit } from "./as";
import { suspend } from "./suspend";

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless_<R, E, A>(ma: Managed<R, E, A>, b: () => boolean): Managed<R, E, void> {
   return suspend(() => (b() ? unit() : asUnit(ma)));
}

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless(b: () => boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
   return (ma) => unless_(ma, b);
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export function unlessM_<R, E, A, R1, E1>(
   ma: Managed<R, E, A>,
   mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
   return chain_(mb, (b) => (b ? unit() : asUnit(ma)));
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export function unlessM<R1, E1>(
   mb: Managed<R1, E1, boolean>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, void> {
   return (ma) => unlessM_(ma, mb);
}
