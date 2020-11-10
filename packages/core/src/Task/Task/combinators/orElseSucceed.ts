import { pure } from "../_core";
import type { Task } from "../model";
import { orElse_ } from "./orElse";

export const orElseSucceed_ = <R, E, A, A1>(ma: Task<R, E, A>, a: A1): Task<R, E, A | A1> => orElse_(ma, () => pure(a));

export const orElseSucceed = <A1>(a: A1) => <R, E, A>(self: Task<R, E, A>) => orElseSucceed_(self, a);
