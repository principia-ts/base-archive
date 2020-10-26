import { flow } from "../../Function";
import { toManaged } from "../Task/functions/toManaged";
import { makeRef } from "./combinators";
/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManagedRef = flow(makeRef, toManaged());
