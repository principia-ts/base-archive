import type { Cause } from "../../IO/Cause";
import * as I from "../_internal/_io";
import { Managed } from "../model";

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause_<R, E, A, D>(
  ma: Managed<R, E, A>,
  f: (e: Cause<E>) => Cause<D>
): Managed<R, D, A> {
  return new Managed(I.mapErrorCause_(ma.io, f));
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause<E, D>(
  f: (e: Cause<E>) => Cause<D>
): <R, A>(ma: Managed<R, E, A>) => Managed<R, D, A> {
  return (ma) => mapErrorCause_(ma, f);
}
