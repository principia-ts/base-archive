import { RuntimeError } from "../../Exit/Cause";
import { die } from "../core";

/**
 * Returns a task that dies with a `RuntimeError` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export const dieMessage = (message: string) => die(new RuntimeError(message));
