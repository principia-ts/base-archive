import { succeed } from "./constructors";
import type { Fiber } from "./model";

/*
 * -------------------------------------------
 * Unit Fiber
 * -------------------------------------------
 */

export const unit = (): Fiber<never, void> => succeed(undefined);
