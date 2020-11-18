import { fail } from "../_core";
import type { Task } from "../model";
import { orElse_ } from "./orElse";

export function orElseFail_<R, E, A, E1>(ma: Task<R, E, A>, e: E1): Task<R, E1, A> {
  return orElse_(ma, () => fail(e));
}

export function orElseFail<E1>(e: E1): <R, E, A>(fa: Task<R, E, A>) => Task<R, E1, A> {
  return (fa) => orElseFail_(fa, e);
}
