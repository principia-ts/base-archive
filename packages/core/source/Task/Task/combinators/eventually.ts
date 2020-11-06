import type { Task } from "../model";
import { orElse_ } from "./orElse";

export const eventually = <R, E, A>(ma: Task<R, E, A>): Task<R, never, A> => orElse_(ma, () => eventually(ma));
