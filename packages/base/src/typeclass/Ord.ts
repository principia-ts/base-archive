import type { Eq } from './Eq'
import type { Ordering } from './Ordering'

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

export const makeOrd = <A>(cmp: (x: A, y: A) => Ordering): Ord<A> => {
  return {
    compare_: cmp,
    compare: (y) => (x) => cmp(x, y),
    equals_: (x, y) => cmp(x, y) === 0,
    equals: (y) => (x) => cmp(x, y) === 0
  }
}
