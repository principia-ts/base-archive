import type { IO } from "../core";

import * as E from "@principia/base/data/Either";

import { foldM_, pure } from "../core";

export function either<R, E, A>(self: IO<R, E, A>): IO<R, never, E.Either<E, A>> {
  return foldM_(
    self,
    (e) => pure(E.left(e)),
    (a) => pure(E.right(a))
  );
}
