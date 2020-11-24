import type { Reader } from "./model";

/*
 * -------------------------------------------
 * Unit Reader
 * -------------------------------------------
 */

export function unit(): Reader<unknown, void> {
  return () => undefined;
}
