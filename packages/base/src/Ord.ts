import type * as Eq from './Eq'
import type { Endomorphism, Predicate } from './Function'
import type { Monoid } from './Monoid'
import type { Ordering } from './Ordering'
import type { Semigroup } from './Semigroup'

import { flow } from './Function'
import * as O from './internal/ord'
import { EQ, GT, LT } from './Ordering'
import { makeSemigroup } from './Semigroup'

type Eq<A> = Eq.Eq<A>

export interface Ord<A> extends Eq<A> {
  readonly compare_: CompareFn_<A>
  readonly compare: CompareFn<A>
}

export interface CompareFn<A> {
  (y: A): (x: A) => Ordering
}

export interface CompareFn_<A> {
  (x: A, y: A): Ordering
}

export const makeOrd = <A>(cmp: (x: A, y: A) => Ordering, equals?: (x: A, y: A) => boolean): Ord<A> => {
  const equals_ = equals ?? ((x, y) => cmp(x, y) === 0)
  return {
    compare_: cmp,
    compare: (y) => (x) => cmp(x, y),
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return makeOrd((x, y) => fa.compare_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f)
}

export const lt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) === LT

export const gt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) === GT

export const leq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) !== GT

export const geq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) !== LT

export const min = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare_(x, y) === GT ? y : x)

export const max = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare_(x, y) === LT ? y : x)

export const lt_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) === LT

export const gt_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) === GT

export const leq_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) !== GT

export const geq_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) !== LT

export const min_ = O.min_

export const max_ = O.max_

export function clamp<A>(O: Ord<A>): (low: A, hi: A) => Endomorphism<A> {
  const minO = min(O)
  const maxO = max(O)
  return (low, hi) => flow(minO(hi), maxO(low))
}

export function between<A>(O: Ord<A>): (low: A, hi: A) => Predicate<A> {
  const ltO = lt_(O)
  const gtO = gt_(O)
  return (low, hi) => (a) => (ltO(a, low) || gtO(a, hi) ? false : true)
}

export const getSemigroup = <A = never>(): Semigroup<Ord<A>> => {
  return makeSemigroup((x, y) =>
    makeOrd((a1, a2) => {
      const ox = x.compare_(a1, a2)
      return ox !== 0 ? ox : y.compare_(a1, a2)
    })
  )
}

export const getMonoid = <A = never>(): Monoid<Ord<A>> => ({
  ...getSemigroup<A>(),
  nat: makeOrd(() => EQ)
})
