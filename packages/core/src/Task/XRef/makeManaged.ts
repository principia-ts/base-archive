import { flow } from "../../Function";
import { toManaged } from "../Task/combinators/toManaged";
import { make } from "./constructors";
/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManaged = flow(make, toManaged());
