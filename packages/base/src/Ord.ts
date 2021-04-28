import * as P from '@principia/prelude'

import { EQ, GT, LT } from './Ordering'

export * from '@principia/prelude/Ord'

export type TypeOf<O> = O extends P.Ord<infer A> ? A : never

export function contramap_<A, B>(fa: P.Ord<A>, f: (b: B) => A): P.Ord<B> {
  return P.Ord((x, y) => fa.compare_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: P.Ord<A>) => P.Ord<B> {
  return (fa) => contramap_(fa, f)
}

export function lt<A>(O: P.Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) === LT
}

export function gt<A>(O: P.Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) === GT
}

export function leq<A>(O: P.Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) !== GT
}

export function geq<A>(O: P.Ord<A>) {
  return (y: A) => (x: A): boolean => O.compare_(x, y) !== LT
}

export function min_<A>(O: P.Ord<A>): (x: A, y: A) => A {
  return (x, y) => (x === y || O.compare_(x, y) < 1 ? x : y)
}

export function max_<A>(O: P.Ord<A>): (x: A, y: A) => A {
  return (x, y) => (x === y || O.compare_(x, y) > -1 ? x : y)
}

export function min<A>(O: P.Ord<A>) {
  return (y: A) => (x: A): A => (O.compare_(x, y) === GT ? y : x)
}

export function max<A>(O: P.Ord<A>) {
  return (y: A) => (x: A): A => (O.compare_(x, y) === LT ? y : x)
}

export function lt_<A>(O: P.Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) === LT
}

export function gt_<A>(O: P.Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) === GT
}

export function leq_<A>(O: P.Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) !== GT
}

export function geq_<A>(O: P.Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) !== LT
}

export function clamp<A>(O: P.Ord<A>): (low: A, hi: A) => P.Endomorphism<A> {
  const minO = min(O)
  const maxO = max(O)
  return (low, hi) => P.flow(minO(hi), maxO(low))
}

export function between<A>(O: P.Ord<A>): (low: A, hi: A) => P.Predicate<A> {
  const ltO = lt_(O)
  const gtO = gt_(O)
  return (low, hi) => (a) => (ltO(a, low) || gtO(a, hi) ? false : true)
}

export function tuple<A extends ReadonlyArray<P.Ord<any>>>(
  ...ords: A
): P.Ord<Readonly<{ [i in keyof A]: TypeOf<A[i]> }>> {
  return P.Ord((x, y) => {
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

export function reverse<A>(O: P.Ord<A>): P.Ord<A> {
  return P.Ord((x, y) => O.compare_(y, x))
}

export const getSemigroup = <A = never>(): P.Semigroup<P.Ord<A>> => {
  return P.Semigroup((x, y) =>
    P.Ord((a1, a2) => {
      const ox = x.compare_(a1, a2)
      return ox !== 0 ? ox : y.compare_(a1, a2)
    })
  )
}

export const getMonoid = <A = never>(): P.Monoid<P.Ord<A>> => ({
  ...getSemigroup<A>(),
  nat: P.Ord(() => EQ)
})
