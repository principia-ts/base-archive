import * as X from "../XPure";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * Unit EIO
 * -------------------------------------------
 */

export const unit: <E = never>() => EIO<E, void> = X.unit;
