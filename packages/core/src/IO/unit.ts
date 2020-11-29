import * as X from "../SIO";
import type { IO } from "./model";

/*
 * -------------------------------------------
 * Unit IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> IO ()
 * ```
 */
export const unit: () => IO<void> = X.unit;
