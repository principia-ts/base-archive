import * as E from "../../../Either";
import { foldM_, pure } from "../core";
import type { Task } from "../model";

export const either = <R, E, A>(self: Task<R, E, A>): Task<R, never, E.Either<E, A>> =>
   foldM_(
      self,
      (e) => pure(E.left(e)),
      (a) => pure(E.right(a))
   );
