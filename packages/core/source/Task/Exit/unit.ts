import { succeed } from "./constructors";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Unit Exit
 * -------------------------------------------
 */

export const unit: Exit<never, void> = succeed(undefined);
