import * as E from "../../../Either";
import { foldM_, pure } from "../_core";
import type { AIO } from "../model";

export function either<R, E, A>(self: AIO<R, E, A>): AIO<R, never, E.Either<E, A>> {
  return foldM_(
    self,
    (e) => pure(E.left(e)),
    (a) => pure(E.right(a))
  );
}
