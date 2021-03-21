import * as E from './Eq'
import * as G from './Guard'
import * as P from './typeclass'

export const Eq: P.Eq<number> = E.EqStrict

export const Ord: P.Ord<number> = P.makeOrd((x, y) => (x < y ? -1 : x > y ? 1 : 0))

export const Bounded: P.Bounded<number> = {
  ...Ord,
  top: Infinity,
  bottom: -Infinity
}

export const Show: P.Show<number> = P.makeShow((x) => JSON.stringify(x))

export const SemigroupSum: P.Semigroup<number> = P.makeSemigroup((x, y) => x + y)

export const SemigroupProduct: P.Semigroup<number> = P.makeSemigroup((x, y) => x * y)

export const MonoidSum: P.Monoid<number> = {
  ...SemigroupSum,
  nat: 0
}

export const MonoidProduct: P.Monoid<number> = {
  ...SemigroupProduct,
  nat: 1
}

export const Guard: G.Guard<unknown, number> = G.makeGuard((u): u is number => typeof u === 'number')
