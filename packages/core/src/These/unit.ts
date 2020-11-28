import { right } from "./constructors";
import type { These } from "./model";

/*
 * -------------------------------------------
 * Unit These
 * -------------------------------------------
 */

export function unit(): These<never, void> {
  return right(undefined);
}
