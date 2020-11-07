import * as T from "./_internal/task";
import { fromTask } from "./constructors";
import type { Managed } from "./model";

export const unit = (): Managed<unknown, never, void> => fromTask(T.unit());
