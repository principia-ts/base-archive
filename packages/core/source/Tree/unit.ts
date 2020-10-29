import * as A from "../Array";
import type { Tree } from "./model";

/*
 * -------------------------------------------
 * Unit Tree
 * -------------------------------------------
 */

export const unit = (): Tree<void> => ({
   value: undefined,
   forest: A.empty()
});
