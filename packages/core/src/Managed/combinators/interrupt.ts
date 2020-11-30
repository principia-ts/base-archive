import * as C from "../../IO/Cause";
import type { FiberId } from "../../IO/Fiber/FiberId";
import * as I from "../_internal/io";
import { fromEffect, halt } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";

/**
 * Returns a Managed that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: Managed<unknown, never, never> = chain_(
  fromEffect(I.descriptorWith((d) => I.succeed(d.id))),
  (id) => halt(C.interrupt(id))
);

/**
 * Returns a Managed that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberId): Managed<unknown, never, never> {
  return halt(C.interrupt(fiberId));
}
