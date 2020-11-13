import { succeed } from "./constructors";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Unit Exit
 * -------------------------------------------
 */

export function unit(): Exit<never, void> {
   return succeed(undefined);
}
