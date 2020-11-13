import * as T from "./_internal/task";
import { fromTask } from "./constructors";
import type { Managed } from "./model";

export function unit(): Managed<unknown, never, void> {
   return fromTask(T.unit());
}
