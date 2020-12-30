import type { IO } from '../core'

import * as E from '@principia/base/data/Either'

import { asksM, giveAll_, map_ } from '../core'

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const join_ = <R, E, A, R1, E1, A1>(
  io: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<E.Either<R, R1>, E | E1, A | A1> =>
    asksM(
      (_: E.Either<R, R1>): IO<E.Either<R, R1>, E | E1, A | A1> =>
        E.fold_(
          _,
          (r) => giveAll_(io, r),
          (r1) => giveAll_(that, r1)
        )
    )

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const join = <R1, E1, A1>(that: IO<R1, E1, A1>) => <R, E, A>(
  io: IO<R, E, A>
): IO<E.Either<R, R1>, E | E1, A | A1> => join_(io, that)

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither_ = <R, E, A, R1, E1, A1>(
  io: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
    asksM(
      (_: E.Either<R, R1>): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
        E.fold_(
          _,
          (r) => map_(giveAll_(io, r), E.left),
          (r1) => map_(giveAll_(that, r1), E.right)
        )
    )

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither = <R1, E1, A1>(that: IO<R1, E1, A1>) => <R, E, A>(
  io: IO<R, E, A>
): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> => joinEither_(io, that)
