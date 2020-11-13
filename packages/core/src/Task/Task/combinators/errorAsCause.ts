import { foldM_, halt, pure } from "../_core";
import type { Cause } from "../../Exit/Cause/model";
import type { Task } from "../model";

export function errorAsCause<R, E, A>(fa: Task<R, Cause<E>, A>): Task<R, E, A> {
   return foldM_(fa, halt, pure);
}
