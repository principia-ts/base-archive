import type { FiberId } from "../../Fiber/FiberId";
import * as T from "../_internal/_aio";
import { fromEffect } from "../constructors";
import type { Managed } from "../model";

export function fiberId(): Managed<unknown, never, FiberId> {
  return fromEffect(T.fiberId());
}
