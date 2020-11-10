import { flow } from "../../Function";
import { toManaged } from "../Task/combinators/toManaged";
import { makeRef } from "./constructors";
/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManagedRef = flow(makeRef, toManaged());
