import type { EIO } from "../_core";
import { die } from "../_core";
import { RuntimeError } from "../../Exit/Cause";

/**
 * Returns a task that dies with a `RuntimeError` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string): EIO<never, never> {
  return die(new RuntimeError(message));
}
