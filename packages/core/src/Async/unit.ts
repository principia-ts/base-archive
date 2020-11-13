import { succeed } from "./constructors";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Unit Async
 * -------------------------------------------
 */

export function unit(): Async<unknown, never, void> {
   return succeed(undefined);
}
