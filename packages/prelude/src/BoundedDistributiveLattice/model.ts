/**
 * A `BoundedDistributiveLattice` is a lattice that is both bounded and distributive
 *
 * @since 1.0.0
 */
import type { BoundedLattice } from "../BoundedLattice";
import type { DistributiveLattice } from "../DistributiveLattice";
import { getMinMaxDistributiveLattice } from "../DistributiveLattice";
import type { Ord } from "../Ord";

/**
 * @category Type Classes
 * @since 1.0.0
 */
export interface BoundedDistributiveLattice<A> extends BoundedLattice<A>, DistributiveLattice<A> {}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMinMaxBoundedDistributiveLattice<A>(
  O: Ord<A>
): (min: A, max: A) => BoundedDistributiveLattice<A> {
  const L = getMinMaxDistributiveLattice(O);
  return (min, max) => ({
    join: L.join,
    meet: L.meet,
    zero: min,
    one: max
  });
}
