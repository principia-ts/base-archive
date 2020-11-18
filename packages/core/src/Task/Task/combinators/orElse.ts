import { pure } from "../_core";
import type { Task } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export function orElse_<R, E, A, R1, E1, A1>(
  ma: Task<R, E, A>,
  that: () => Task<R1, E1, A1>
): Task<R & R1, E1, A | A1> {
  return tryOrElse_(ma, that, pure);
}

export function orElse<R1, E1, A1>(
  that: () => Task<R1, E1, A1>
): <R, E, A>(ma: Task<R, E, A>) => Task<R & R1, E1, A1 | A> {
  return (ma) => tryOrElse_(ma, that, pure);
}
