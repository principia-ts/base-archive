import type { State } from "./model";

/*
 * -------------------------------------------
 * Unit State
 * -------------------------------------------
 */

export function unit<S>(): State<S, void> {
  return (s) => [undefined, s];
}
