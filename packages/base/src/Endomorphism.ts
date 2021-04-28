import * as P from '@principia/prelude'

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

export function getSemigroup<A>(): P.Semigroup<P.Endomorphism<A>> {
  return P.Semigroup((x, y) => P.flow(x, y))
}

export function getMonoid<A>(): P.Monoid<P.Endomorphism<A>> {
  return P.Monoid((x, y) => P.flow(x, y), P.identity)
}
