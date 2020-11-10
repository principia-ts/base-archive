import * as T from "../_internal/_task";
import type { FiberId } from "../../Fiber/FiberId";
import { fromTask } from "../constructors";
import type { Managed } from "../model";

export const fiberId = (): Managed<unknown, never, FiberId> => fromTask(T.fiberId());
