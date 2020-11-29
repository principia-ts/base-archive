import * as E from "../../../Either";
import { asksM, giveAll_, map_ } from "../_core";
import type { AIO } from "../model";

/**
 * Joins two `AIOs` into one, where one or the other is returned depending on the provided environment
 */
export const join_ = <R, E, A, R1, E1, A1>(
  aio: AIO<R, E, A>,
  that: AIO<R1, E1, A1>
): AIO<E.Either<R, R1>, E | E1, A | A1> =>
  asksM(
    (_: E.Either<R, R1>): AIO<E.Either<R, R1>, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => giveAll_(aio, r),
        (r1) => giveAll_(that, r1)
      )
  );

/**
 * Joins two `AIOs` into one, where one or the other is returned depending on the provided environment
 */
export const join = <R1, E1, A1>(that: AIO<R1, E1, A1>) => <R, E, A>(
  aio: AIO<R, E, A>
): AIO<E.Either<R, R1>, E | E1, A | A1> => join_(aio, that);

/**
 * Joins two `AIOs` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither_ = <R, E, A, R1, E1, A1>(
  aio: AIO<R, E, A>,
  that: AIO<R1, E1, A1>
): AIO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
  asksM(
    (_: E.Either<R, R1>): AIO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
      E.fold_(
        _,
        (r) => map_(giveAll_(aio, r), E.left),
        (r1) => map_(giveAll_(that, r1), E.right)
      )
  );

/**
 * Joins two `AIOs` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither = <R1, E1, A1>(that: AIO<R1, E1, A1>) => <R, E, A>(
  aio: AIO<R, E, A>
): AIO<E.Either<R, R1>, E | E1, E.Either<A, A1>> => joinEither_(aio, that);
