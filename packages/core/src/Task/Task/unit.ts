import { succeed } from "./constructors";
import type { IO } from "./model";

/*
 * -------------------------------------------
 * Unit Task
 * -------------------------------------------
 */

export function unit(): IO<void> {
   return succeed(undefined);
}
