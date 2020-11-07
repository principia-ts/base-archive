import { boolean } from "@principia/prelude/Eq";
import { RSA_SSLV23_PADDING } from "constants";

import { succeed } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export const ifM_ = <R, E, R1, E1, B, R2, E2, C>(
   mb: Managed<R, E, boolean>,
   onTrue: () => Managed<R1, E1, B>,
   onFalse: () => Managed<R2, E2, C>
): Managed<R & R1 & R2, E | E1 | E2, B | C> =>
   chain_(mb, (b) => (b ? (onTrue() as Managed<R & R1 & R2, E | E1 | E2, B | C>) : onFalse()));

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export const ifM = <R1, E1, B, R2, E2, C>(onTrue: () => Managed<R1, E1, B>, onFalse: () => Managed<R2, E2, C>) => <
   R,
   E
>(
   mb: Managed<R, E, boolean>
): Managed<R & R1 & R2, E | E1 | E2, B | C> => ifM_(mb, onTrue, onFalse);

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export const if_ = <R, E, A, R1, E1, B>(
   b: boolean,
   onTrue: () => Managed<R, E, A>,
   onFalse: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> => ifM_(succeed(b), onTrue, onFalse);

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
const _if = <R, E, A, R1, E1, B>(onTrue: () => Managed<R, E, A>, onFalse: () => Managed<R1, E1, B>) => (
   b: boolean
): Managed<R & R1, E | E1, A | B> => if_(b, onTrue, onFalse);
export { _if as if };
