import * as E from "@principia/core/Either";

import { foldM_, pure } from "../core";
import type { Effect } from "../Effect";

export const either = <R, E, A>(self: Effect<R, E, A>): Effect<R, never, E.Either<E, A>> =>
   foldM_(
      self,
      (e) => pure(E.left(e)),
      (a) => pure(E.right(a))
   );
