import * as T from "../_internal/task";
import { Managed } from "../core";

export const suspend = <R, E, A>(thunk: () => Managed<R, E, A>) => new Managed(T.suspend(() => thunk().task));
