import * as T from "../_internal/task";
import { Managed } from "../model";

export function eventually<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
   return new Managed(T.eventually(ma.task));
}
