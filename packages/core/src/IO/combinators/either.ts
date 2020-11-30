import * as E from "../../Either";
import { foldM_, pure } from "../_core";
import type { IO } from "../model";

export function either<R, E, A>(self: IO<R, E, A>): IO<R, never, E.Either<E, A>> {
  return foldM_(
    self,
    (e) => pure(E.left(e)),
    (a) => pure(E.right(a))
  );
}
