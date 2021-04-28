import type * as P from '@principia/prelude'

import * as DL from './DistributiveLattice'

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMinMax<A>(O: P.Ord<A>): (min: A, max: A) => P.BoundedDistributiveLattice<A> {
  const L = DL.getMinMax(O)
  return (min, max) => ({
    join: L.join,
    meet: L.meet,
    zero: min,
    one: max
  })
}
