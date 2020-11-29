import * as E from "../../../Either";
import { map_, pure } from "../_core";
import type { AIO } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export function orElseEither_<R, E, A, R1, E1, A1>(
  self: AIO<R, E, A>,
  that: AIO<R1, E1, A1>
): AIO<R & R1, E1, E.Either<A, A1>> {
  return tryOrElse_(
    self,
    () => map_(that, E.right),
    (a) => pure(E.left(a))
  );
}

export function orElseEither<R1, E1, A1>(
  that: AIO<R1, E1, A1>
): <R, E, A>(ma: AIO<R, E, A>) => AIO<R & R1, E1, E.Either<A, A1>> {
  return (ma) => orElseEither_(ma, that);
}
