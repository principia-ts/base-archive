import { flow } from "../Function";
import { toManaged } from "../IO/combinators/toManaged";
import { make } from "./constructors";
/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManaged = flow(make, toManaged());
