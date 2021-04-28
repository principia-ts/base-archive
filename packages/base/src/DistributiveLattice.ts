import type * as P from '@principia/prelude'

import { max_, min_ } from './Ord'

/**
 * @category instances
 * @since 1.0.0
 */
export function getMinMax<A>(O: P.Ord<A>): P.DistributiveLattice<A> {
  return {
    meet: min_(O),
    join: max_(O)
  }
}

export * from '@principia/prelude/DistributiveLattice'
