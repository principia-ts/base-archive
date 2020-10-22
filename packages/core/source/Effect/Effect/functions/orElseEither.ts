import * as E from "../../../Either";
import { map_, pure } from "../core";
import type { Effect } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export const orElseEither_ = <R, E, A, R1, E1, A1>(
   self: Effect<R, E, A>,
   that: Effect<R1, E1, A1>
): Effect<R & R1, E1, E.Either<A, A1>> =>
   tryOrElse_(
      self,
      () => map_(that, E.right),
      (a) => pure(E.left(a))
   );

export const orElseEither = <R1, E1, A1>(that: Effect<R1, E1, A1>) => <R, E, A>(ma: Effect<R, E, A>) =>
   orElseEither_(ma, that);
