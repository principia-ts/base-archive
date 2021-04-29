import type { Endomorphism } from './Endomorphism'
import type { Eq } from './Eq'
import type { Monoid } from './Monoid'
import type { Ordering } from './Ordering'
import type { Predicate } from './Predicate'

import { flow } from './function'
import * as O from './internal/Ord'
import { EQ, GT, LT } from './Ordering'
import { Semigroup } from './Semigroup'

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

export function Ord<A>(compare: (x: A, y: A) => Ordering, equals?: (x: A, y: A) => boolean): Ord<A> {
  const equals_ = equals ?? ((x, y) => compare(x, y) === 0)
  return {
    compare_: compare,
    compare: (y) => (x) => compare(x, y),
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

export type TypeOf<O> = O extends Ord<infer A> ? A : never

export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return Ord((x, y) => fa.compare_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f)
}

export function lt<A>(O: Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) === LT
}

export function gt<A>(O: Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) === GT
}

export function leq<A>(O: Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) !== GT
}

export function geq<A>(O: Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) !== LT
}

export const min_ = O.min_

export const max_ = O.max_

export function min<A>(O: Ord<A>) {
  return (y: A) => (x: A): A => (O.compare_(x, y) === GT ? y : x)
}

export function max<A>(O: Ord<A>) {
  return (y: A) => (x: A): A => (O.compare_(x, y) === LT ? y : x)
}

export function lt_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) === LT
}

export function gt_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) === GT
}

export function leq_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) !== GT
}

export function geq_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) !== LT
}

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

export function tuple<A extends ReadonlyArray<Ord<any>>>(...ords: A): Ord<Readonly<{ [i in keyof A]: TypeOf<A[i]> }>> {
  return Ord((x, y) => {
    let i = 0
    for (; i < ords.length - 1; i++) {
      const r = ords[i].compare_(x[i], y[i])
      if (r !== 0) {
        return r
      }
    }
    return ords[i].compare_(x[i], y[i])
  })
}

export function reverse<A>(O: Ord<A>): Ord<A> {
  return Ord((x, y) => O.compare_(y, x))
}

export const getSemigroup = <A = never>(): Semigroup<Ord<A>> => {
  return Semigroup((x, y) =>
    Ord((a1, a2) => {
      const ox = x.compare_(a1, a2)
      return ox !== 0 ? ox : y.compare_(a1, a2)
    })
  )
}

export const getMonoid = <A = never>(): Monoid<Ord<A>> => ({
  ...getSemigroup<A>(),
  nat: Ord(() => EQ)
})
