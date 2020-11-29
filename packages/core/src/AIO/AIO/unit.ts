import { succeed } from "./constructors";
import type { IO } from "./model";

/*
 * -------------------------------------------
 * Unit AIO
 * -------------------------------------------
 */

export function unit(): IO<void> {
  return succeed(undefined);
}
