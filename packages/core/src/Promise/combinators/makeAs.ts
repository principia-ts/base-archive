import { total } from "../../IO/_core";
import type { FiberId } from "../../IO/Fiber/FiberId";
import { unsafeMake } from "./unsafeMake";

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export function makeAs<E, A>(fiberId: FiberId) {
  return total(() => unsafeMake<E, A>(fiberId));
}
