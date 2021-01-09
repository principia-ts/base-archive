import type { Eq } from './Eq'
import type { Monoid } from './Monoid'
import type { CombineFn_ } from './Semigroup'

import { boolean, number, string } from './Eq/core'
import { EQ, GT, LT, MonoidOrdering, Ordering } from './Ordering'

export const OrdURI = 'Ord'

export type OrdURI = typeof OrdURI

export interface Ord<A> extends Eq<A> {
  readonly compare_: CompareFn_<A>
  readonly compare: CompareFn<A>
}

declare module './HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [OrdURI]: Ord<A>
  }
}

export interface CompareFn<A> {
  (y: A): (x: A) => Ordering
}

export interface CompareFn_<A> {
  (x: A, y: A): Ordering
}

export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return fromCompare((x, y) => fa.compare_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f)
}

export const fromCompare = <A>(cmp: (x: A, y: A) => Ordering): Ord<A> => {
  return {
    compare_: cmp,
    compare: (y) => (x) => cmp(x, y),
    equals_: (x, y) => Ordering.unwrap(cmp(x, y)) === 'EQ',
    equals: (y) => (x) => Ordering.unwrap(cmp(x, y)) === 'EQ'
  }
}

const defaultCompare = (y: any): ((x: any) => Ordering) => {
  return (x) => (x < y ? LT : x > y ? GT : EQ)
}

const defaultCompare_ = (x: any, y: any) => (x < y ? LT : x > y ? GT : EQ)

export const ordString: Ord<string> = {
  ...string,
  compare: defaultCompare,
  compare_: defaultCompare_
}

export const ordNumber: Ord<number> = {
  ...number,
  compare: defaultCompare,
  compare_: defaultCompare_
}

export const ordBoolean: Ord<boolean> = {
  ...boolean,
  compare: defaultCompare,
  compare_: defaultCompare_
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

export const min_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === GT ? y : x)

export const max_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === LT ? y : x)

export const getMonoid = <A = never>(): Monoid<Ord<A>> => {
  const combine_: CombineFn_<Ord<A>> = (x, y) =>
    fromCompare((a, b) => MonoidOrdering.combine_(x.compare(a)(b), y.compare(a)(b)))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y),
    nat: fromCompare(() => EQ)
  }
}
