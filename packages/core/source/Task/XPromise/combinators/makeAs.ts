import type { FiberId } from "../../Fiber/FiberId";
import { total } from "../../Task/_core";
import { unsafeMake } from "./unsafeMake";

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export const makeAs = <E, A>(fiberId: FiberId) => total(() => unsafeMake<E, A>(fiberId));
