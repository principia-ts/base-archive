import * as T from "../_internal/task";
import type { Managed } from "../core";
import { managed } from "../core";

export const suspend = <R, E, A>(thunk: () => Managed<R, E, A>) => managed(T.suspend(() => thunk().effect));
