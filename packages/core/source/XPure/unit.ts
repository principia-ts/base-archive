import { succeed } from "./constructors";
import type { XPure } from "./model";

/*
 * -------------------------------------------
 * Unit XPure
 * -------------------------------------------
 */

export const unit = (): XPure<unknown, never, unknown, never, void> => succeed(undefined);
