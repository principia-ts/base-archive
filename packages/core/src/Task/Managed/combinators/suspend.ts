import { Managed } from "../_core";
import * as T from "../_internal/task";

export const suspend = <R, E, A>(thunk: () => Managed<R, E, A>) => new Managed(T.suspend(() => thunk().task));
