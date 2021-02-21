import type { Predicate, Refinement } from './Function'
import type { Ord } from './Ord'

import { not } from './Function'
import { OrderedMap } from './OrderedMap'
import * as OM from './OrderedMap'

export class OrderedSet<A> implements Iterable<A> {
  constructor(readonly keyMap: OM.OrderedMap<A, null>) {}

  [Symbol.iterator](): Iterator<A> {
    return OM.keys_(this.keyMap)[Symbol.iterator]()
  }
}

export function make<A>(ord: Ord<A>): OrderedSet<A> {
  return new OrderedSet(OM.make(ord))
}

export function add_<A>(set: OrderedSet<A>, a: A): OrderedSet<A> {
  return new OrderedSet(OM.insert_(set.keyMap, a, null))
}

export function add<A>(a: A): (set: OrderedSet<A>) => OrderedSet<A> {
  return (set) => add_(set, a)
}

export function remove_<A>(set: OrderedSet<A>, a: A): OrderedSet<A> {
  return new OrderedSet(OM.remove_(set.keyMap, a))
}

export function remove<A>(a: A): (set: OrderedSet<A>) => OrderedSet<A> {
  return (set) => new OrderedSet(OM.remove_(set.keyMap, a))
}

export function has_<A>(set: OrderedSet<A>, a: A): boolean {
  return OM.get_(set.keyMap, a)._tag === 'Some'
}

export function has<A>(a: A): (set: OrderedSet<A>) => boolean {
  return (set) => has_(set, a)
}

export function forEach_<A>(set: OrderedSet<A>, f: (a: A) => void): void {
  return OM.iforEach_(set.keyMap, (a) => f(a))
}

export function forEach<A>(f: (a: A) => void): (set: OrderedSet<A>) => void {
  return (set) => forEach_(set, f)
}

export function map_<B>(O: Ord<B>): <A>(fa: OrderedSet<A>, f: (a: A) => B) => OrderedSet<B> {
  return (fa, f) => {
    let r = make<B>(O)
    forEach_(fa, (a) => {
      r = add_(r, f(a))
    })
    return r
  }
}

export function map<B>(O: Ord<B>): <A>(f: (a: A) => B) => (fa: OrderedSet<A>) => OrderedSet<B> {
  return (f) => (fa) => map_(O)(fa, f)
}

export function bind_<B>(O: Ord<B>): <A>(ma: OrderedSet<A>, f: (a: A) => Iterable<B>) => OrderedSet<B> {
  return (ma, f) => {
    let r = make(O)
    forEach_(ma, (a) => {
      for (const b of f(a)) {
        if (!has_(r, b)) {
          r = add_(r, b)
        }
      }
    })
    return r
  }
}

export function bind<B>(O: Ord<B>): <A>(f: (A: A) => Iterable<B>) => (ma: OrderedSet<A>) => OrderedSet<B> {
  return (f) => (ma) => bind_(O)(ma, f)
}

export function foldl_<A, Z>(fa: OrderedSet<A>, z: Z, f: (z: Z, a: A) => Z): Z {
  return OM.ifoldl_(fa.keyMap, z, (z, a) => f(z, a))
}

export function foldl<A, Z>(z: Z, f: (z: Z, a: A) => Z): (fa: OrderedSet<A>) => Z {
  return (fa) => foldl_(fa, z, f)
}

export function toArray<A>(set: OrderedSet<A>): ReadonlyArray<A> {
  const r: Array<A> = []
  forEach_(set, (a) => {
    r.push(a)
  })
  return r
}

export function values_<A>(set: OrderedSet<A>, direction: 0 | 1 = 0): Iterable<A> {
  return OM.keys_(set.keyMap, direction)
}

export function values(direction: 0 | 1 = 0): <A>(set: OrderedSet<A>) => Iterable<A> {
  return (set) => values_(set, direction)
}

export function difference_<A>(x: OrderedSet<A>, y: OrderedSet<A>): OrderedSet<A> {
  let r = x
  for (const a of y) {
    r = remove_(r, a)
  }
  return r
}

export function difference<A>(y: OrderedSet<A>): (x: OrderedSet<A>) => OrderedSet<A> {
  return (x) => difference_(x, y)
}

export function union_<A>(x: OrderedSet<A>, y: Iterable<A>): OrderedSet<A> {
  let r = make(x.keyMap.ord)
  forEach_(x, (a) => {
    r = add_(r, a)
  })
  for (const a of y) {
    r = add_(r, a)
  }
  return r
}

export function union<A>(y: Iterable<A>): (x: OrderedSet<A>) => OrderedSet<A> {
  return (x) => union_(x, y)
}

export function some_<A>(set: OrderedSet<A>, predicate: Predicate<A>): boolean {
  let found = false
  for (const a of set) {
    found = predicate(a)
    if (found) break
  }
  return found
}

export function some<A>(predicate: Predicate<A>): (set: OrderedSet<A>) => boolean {
  return (set) => some_(set, predicate)
}

export function every_<A>(set: OrderedSet<A>, predicate: Predicate<A>): boolean {
  return not(some(not(predicate)))(set)
}

export function isSubset_<A>(x: OrderedSet<A>, y: OrderedSet<A>): boolean {
  return every_(x, (a) => has_(y, a))
}

export function isSubset<A>(y: OrderedSet<A>): (x: OrderedSet<A>) => boolean {
  return (x) => isSubset_(x, y)
}

export function filter_<A, B extends A>(set: OrderedSet<A>, refinement: Refinement<A, B>): OrderedSet<B>
export function filter_<A>(set: OrderedSet<A>, predicate: Predicate<A>): OrderedSet<A>
export function filter_<A>(set: OrderedSet<A>, predicate: Predicate<A>): OrderedSet<A> {
  return new OrderedSet(OM.ifilter_(set.keyMap, (a) => predicate(a)))
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (set: OrderedSet<A>) => OrderedSet<B>
export function filter<A>(predicate: Predicate<A>): (set: OrderedSet<A>) => OrderedSet<A>
export function filter<A>(predicate: Predicate<A>): (set: OrderedSet<A>) => OrderedSet<A> {
  return (set) => filter_(set, predicate)
}
