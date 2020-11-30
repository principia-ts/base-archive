import type { Monoid } from "@principia/prelude";

import { succeed } from "./constructors";
import type { FSync, USync } from "./model";
import { getFailableSemigroup, getUnfailableSemigroup } from "./semigroup";

/*
 * -------------------------------------------
 * Monoid Sync
 * -------------------------------------------
 */

export function getUnfailableMonoid<M>(M: Monoid<M>): Monoid<USync<M>> {
  return {
    ...getUnfailableSemigroup(M),
    nat: succeed(M.nat)
  };
}

export function getFailableMonoid<E, A>(MA: Monoid<A>, ME: Monoid<E>): Monoid<FSync<E, A>> {
  return {
    ...getFailableSemigroup(MA, ME),
    nat: succeed(MA.nat)
  };
}
