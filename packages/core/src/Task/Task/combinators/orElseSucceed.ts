import { pure } from "../_core";
import type { Task } from "../model";
import { orElse_ } from "./orElse";

export function orElseSucceed_<R, E, A, A1>(ma: Task<R, E, A>, a: A1): Task<R, E, A | A1> {
   return orElse_(ma, () => pure(a));
}

export function orElseSucceed<A1>(a: A1): <R, E, A>(self: Task<R, E, A>) => Task<R, E, A1 | A> {
   return (self) => orElseSucceed_(self, a);
}
