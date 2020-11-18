import { some } from "./constructors";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Unit Option
 * -------------------------------------------
 */

export function unit(): Option<void> {
  return some(undefined);
}
