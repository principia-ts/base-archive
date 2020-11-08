import * as T from "../_internal/task";
import * as C from "../../Exit/Cause";
import type { FiberId } from "../../Fiber/FiberId";
import { fromTask, halt } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";

/**
 * Returns a Managed that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: Managed<unknown, never, never> = chain_(
   fromTask(T.checkDescriptor((d) => T.succeed(d.id))),
   (id) => halt(C.interrupt(id))
);

/**
 * Returns a Managed that is interrupted as if by the specified fiber.
 */
export const interruptAs = (fiberId: FiberId): Managed<unknown, never, never> => halt(C.interrupt(fiberId));
