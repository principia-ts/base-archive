import { succeed } from "./constructors";
import type { XPure } from "./model";

/*
 * -------------------------------------------
 * Unit XPure
 * -------------------------------------------
 */

export function unit(): XPure<unknown, never, unknown, never, void> {
  return succeed(undefined);
}
