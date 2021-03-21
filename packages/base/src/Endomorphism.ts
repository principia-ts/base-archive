import type { Monoid } from './Monoid'
import type { Semigroup } from './Semigroup'

import { flow, identity } from './function'
import * as P from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Endomorphism<A> {
  (a: A): A
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export function getSemigroup<A>(): Semigroup<Endomorphism<A>> {
  return P.makeSemigroup((x, y) => flow(x, y))
}

export function getMonoid<A>(): Monoid<Endomorphism<A>> {
  return P.makeMonoid((x, y) => flow(x, y), identity)
}