import * as X from "../SIO";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * Unit EIO
 * -------------------------------------------
 */

export const unit: <E = never>() => EIO<E, void> = X.unit;
