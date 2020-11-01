import { succeed } from "./constructors";
import type { IO } from "./model";

/*
 * -------------------------------------------
 * Unit Task
 * -------------------------------------------
 */

export const unit = (): IO<void> => succeed(undefined);
