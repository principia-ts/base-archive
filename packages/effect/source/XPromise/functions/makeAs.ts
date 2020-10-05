import { total } from "../../Effect/core";
import type { FiberId } from "../../Fiber/FiberId";
import { unsafeMake } from "./unsafeMake";

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export const makeAs = <E, A>(fiberId: FiberId) => total(() => unsafeMake<E, A>(fiberId));
