import { flow } from "../../Function";
import { toManaged } from "../AIO/combinators/toManaged";
import { make } from "./constructors";
/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManaged = flow(make, toManaged());
