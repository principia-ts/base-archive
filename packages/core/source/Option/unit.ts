import { some } from "./constructors";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Unit Option
 * -------------------------------------------
 */

export const unit = (): Option<void> => some(undefined);
