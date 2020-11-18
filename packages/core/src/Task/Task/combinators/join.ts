import { asksM, giveAll_, map_ } from "../_core";
import * as E from "../../../Either";
import type { Task } from "../model";

/**
 * Joins two `Tasks` into one, where one or the other is returned depending on the provided environment
 */
export const join_ = <R, E, A, R1, E1, A1>(
  task: Task<R, E, A>,
  that: Task<R1, E1, A1>
): Task<E.Either<R, R1>, E | E1, A | A1> =>
  asksM(
    (_: E.Either<R, R1>): Task<E.Either<R, R1>, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => giveAll_(task, r),
        (r1) => giveAll_(that, r1)
      )
  );

/**
 * Joins two `Tasks` into one, where one or the other is returned depending on the provided environment
 */
export const join = <R1, E1, A1>(that: Task<R1, E1, A1>) => <R, E, A>(
  task: Task<R, E, A>
): Task<E.Either<R, R1>, E | E1, A | A1> => join_(task, that);

/**
 * Joins two `Tasks` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither_ = <R, E, A, R1, E1, A1>(
  task: Task<R, E, A>,
  that: Task<R1, E1, A1>
): Task<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
  asksM(
    (_: E.Either<R, R1>): Task<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
      E.fold_(
        _,
        (r) => map_(giveAll_(task, r), E.left),
        (r1) => map_(giveAll_(that, r1), E.right)
      )
  );

/**
 * Joins two `Tasks` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither = <R1, E1, A1>(that: Task<R1, E1, A1>) => <R, E, A>(
  task: Task<R, E, A>
): Task<E.Either<R, R1>, E | E1, E.Either<A, A1>> => joinEither_(task, that);
