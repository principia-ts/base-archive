import type { FiberId } from "../../IO/Fiber/FiberId";
import * as I from "../_internal/_io";
import { fromEffect } from "../constructors";
import type { Managed } from "../model";

export function fiberId(): Managed<unknown, never, FiberId> {
  return fromEffect(I.fiberId());
}
