import type { Task } from "../model";
import { orElse_ } from "./orElse";

export function eventually<R, E, A>(ma: Task<R, E, A>): Task<R, never, A> {
   return orElse_(ma, () => eventually(ma));
}
