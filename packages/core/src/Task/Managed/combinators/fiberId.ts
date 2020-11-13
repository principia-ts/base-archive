import * as T from "../_internal/_task";
import type { FiberId } from "../../Fiber/FiberId";
import { fromTask } from "../constructors";
import type { Managed } from "../model";

export function fiberId(): Managed<unknown, never, FiberId> {
   return fromTask(T.fiberId());
}
