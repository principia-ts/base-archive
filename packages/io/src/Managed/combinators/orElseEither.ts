import type { Managed } from '../core'

import * as E from '@principia/base/data/Either'
import { flow } from '@principia/base/data/Function'

import { foldM_, map_, succeed } from '../core'

export function orElseEither_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E1, E.Either<B, A>> {
  return foldM_(ma, () => map_(that(), E.left), flow(E.right, succeed))
}

export function orElseEither<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, E.Either<B, A>> {
  return (ma) => orElseEither_(ma, that)
}
