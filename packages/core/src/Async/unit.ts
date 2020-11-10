import { succeed } from "./constructors";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Unit Async
 * -------------------------------------------
 */

export const unit = (): Async<unknown, never, void> => succeed(undefined);
