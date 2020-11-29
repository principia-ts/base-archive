import * as T from "../../AIO/_core";
import { fiberId } from "../../AIO/combinators/fiberId";
import type { Fiber } from "../model";
import { interruptAllAs_ } from "./interrupt";

/**
 * Interrupts all fibers and awaits their interruption
 */
export const interruptAll = (fs: Iterable<Fiber<any, any>>) =>
  T.chain_(fiberId(), (id) => interruptAllAs_(fs, id));
