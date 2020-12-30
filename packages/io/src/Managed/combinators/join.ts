import type { FManaged, Managed } from '../core'

import * as E from '@principia/base/data/Either'

import { ask, chain_, giveAll_, map_ } from '../core'

/**
 * Depending on the environment execute this or the other effect
 */
export function join_<R, E, A, R1, E1, A1>(
  ma: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, A | A1> {
  return chain_(
    ask<E.Either<R, R1>>(),
    E.fold(
      (r): FManaged<E | E1, A | A1> => giveAll_(ma, r),
      (r1) => giveAll_(that, r1)
    )
  )
}

/**
 * Depending on the environment execute this or the other effect
 */
export function join<R1, E1, A1>(
  that: Managed<R1, E1, A1>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<E.Either<R, R1>, E1 | E, A1 | A> {
  return (ma) => join_(ma, that)
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  ma: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return chain_(
    ask<E.Either<R, R1>>(),
    E.fold(
      (r): FManaged<E | E1, E.Either<A, A1>> => giveAll_(map_(ma, E.left), r),
      (r1) => giveAll_(map_(that, E.right), r1)
    )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R1, E1, A1>(
  that: Managed<R1, E1, A1>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<E.Either<R, R1>, E1 | E, E.Either<A, A1>> {
  return (ma) => joinEither_(ma, that)
}
