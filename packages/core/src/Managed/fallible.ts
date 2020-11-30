import type { Either } from "../Either";
import * as E from "../Either";
import { flow } from "../Function";
import { fromEither } from "./combinators/from";
import { succeed } from "./constructors";
import { foldM } from "./fold";
import type { Managed } from "./model";
import { chain } from "./monad";

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 */
export const absolve: <R, E, E1, A>(
  fa: Managed<R, E, Either<E1, A>>
) => Managed<R, E | E1, A> = chain((ea) => fromEither(() => ea));

export const recover: <R, E, A>(fa: Managed<R, E, A>) => Managed<R, never, Either<E, A>> = foldM(
  flow(E.left, succeed),
  flow(E.right, succeed)
);
