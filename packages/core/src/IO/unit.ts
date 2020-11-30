import { succeed } from "./constructors";
import type { UIO } from "./model";

/*
 * -------------------------------------------
 * Unit IO
 * -------------------------------------------
 */

export function unit(): UIO<void> {
  return succeed(undefined);
}
