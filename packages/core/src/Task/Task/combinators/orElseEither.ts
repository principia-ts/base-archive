import { map_, pure } from "../_core";
import * as E from "../../../Either";
import type { Task } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export function orElseEither_<R, E, A, R1, E1, A1>(
  self: Task<R, E, A>,
  that: Task<R1, E1, A1>
): Task<R & R1, E1, E.Either<A, A1>> {
  return tryOrElse_(
    self,
    () => map_(that, E.right),
    (a) => pure(E.left(a))
  );
}

export function orElseEither<R1, E1, A1>(
  that: Task<R1, E1, A1>
): <R, E, A>(ma: Task<R, E, A>) => Task<R & R1, E1, E.Either<A, A1>> {
  return (ma) => orElseEither_(ma, that);
}
