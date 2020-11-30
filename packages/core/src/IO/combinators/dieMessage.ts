import type { FIO } from "../_core";
import { die } from "../_core";
import { RuntimeError } from "../Cause";

/**
 * Returns an IO that dies with a `RuntimeError` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string): FIO<never, never> {
  return die(new RuntimeError(message));
}
