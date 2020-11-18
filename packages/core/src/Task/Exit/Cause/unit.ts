import { fail } from "./constructors";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Unit Cause
 * -------------------------------------------
 */

export function unit(): Cause<void> {
  return fail(undefined);
}
