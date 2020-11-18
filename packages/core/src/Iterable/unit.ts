import { iterable } from "./utils";

/*
 * -------------------------------------------
 * Unit Iterable
 * -------------------------------------------
 */

export function unit(): Iterable<void> {
  return iterable(function* () {
    yield undefined;
  });
}
