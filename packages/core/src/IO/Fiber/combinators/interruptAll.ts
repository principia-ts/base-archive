import * as I from "../../_core";
import { fiberId } from "../../combinators/fiberId";
import type { Fiber } from "../model";
import { interruptAllAs_ } from "./interrupt";

/**
 * Interrupts all fibers and awaits their interruption
 */
export const interruptAll = (fs: Iterable<Fiber<any, any>>) =>
  I.chain_(fiberId(), (id) => interruptAllAs_(fs, id));
