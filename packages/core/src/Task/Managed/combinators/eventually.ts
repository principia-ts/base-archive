import * as T from "../_internal/task";
import { Managed } from "../model";

export const eventually = <R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> => new Managed(T.eventually(ma.task));
