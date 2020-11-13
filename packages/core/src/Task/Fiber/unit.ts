import { succeed } from "./constructors";
import type { Fiber } from "./model";

/*
 * -------------------------------------------
 * Unit Fiber
 * -------------------------------------------
 */

export function unit(): Fiber<never, void> {
   return succeed(undefined);
}
