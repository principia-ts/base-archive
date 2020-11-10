import { fail } from "./constructors";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Unit Cause
 * -------------------------------------------
 */

export const unit = (): Cause<void> => fail(undefined);
