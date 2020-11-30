import * as E from "../../Either";
import { map_, pure } from "../_core";
import type { IO } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export function orElseEither_<R, E, A, R1, E1, A1>(
  self: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<R & R1, E1, E.Either<A, A1>> {
  return tryOrElse_(
    self,
    () => map_(that, E.right),
    (a) => pure(E.left(a))
  );
}

export function orElseEither<R1, E1, A1>(
  that: IO<R1, E1, A1>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1, E.Either<A, A1>> {
  return (ma) => orElseEither_(ma, that);
}
