import type { Cause } from "../../IO/Cause";
import * as C from "../../IO/Cause";
import * as I from "../_internal/io";
import { Managed } from "../model";
import { mapErrorCause } from "./mapError";

/**
 * Exposes the full cause of failure of this Managed.
 */
export function sandbox<R, E, A>(ma: Managed<R, E, A>): Managed<R, Cause<E>, A> {
  return new Managed(I.sandbox(ma.io));
}

/**
 * The inverse operation of `sandbox`
 */
export const unsandbox: <R, E, A>(ma: Managed<R, Cause<E>, A>) => Managed<R, E, A> = mapErrorCause(
  C.flatten
);

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (ma: Managed<R, Cause<E>, A>) => Managed<R1, Cause<E1>, B>
): Managed<R & R1, E | E1, B> {
  return unsandbox(f(sandbox(ma)));
}
