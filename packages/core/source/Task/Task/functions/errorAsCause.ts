import type { Cause } from "../../Exit/Cause/model";
import { foldM_, halt, pure } from "../core";
import type { Task } from "../model";

export const errorAsCause = <R, E, A>(fa: Task<R, Cause<E>, A>) => foldM_(fa, halt, pure);
