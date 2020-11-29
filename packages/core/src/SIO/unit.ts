import { succeed } from "./constructors";
import type { SIO } from "./model";

/*
 * -------------------------------------------
 * Unit SIO
 * -------------------------------------------
 */

export function unit(): SIO<unknown, never, unknown, never, void> {
  return succeed(undefined);
}
