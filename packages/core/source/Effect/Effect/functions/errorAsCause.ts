import type { Cause } from "../../Cause/Cause";
import { foldM_, halt, pure } from "../core";
import type { Effect } from "../model";

export const errorAsCause = <R, E, A>(fa: Effect<R, Cause<E>, A>) => foldM_(fa, halt, pure);
