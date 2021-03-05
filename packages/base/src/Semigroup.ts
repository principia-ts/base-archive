import type { Magma } from './Magma'
import type { Ord } from './Ord'

import { max_, min_ } from './internal/ord'

/**
 * `Semigroup` defines an associative binary operator `combine` on given type `A`.
 * `combine` must fulfill the associativity law, which states that for a binary operation `*` on type `A`:
 *
 * ```
 * (a * b) * c === a * (b * c) for all a, b, c, in A
 * ```
 *
 * `Semigroup` defines both an uncurried function `combine_` and a curried function
 * `combine` with arguments interchanged for `pipeable` application.
 */
export interface Semigroup<A> extends Magma<A> {}

export const makeSemigroup = <A>(c: (x: A, y: A) => A): Semigroup<A> => ({
  combine_: c,
  combine: (y) => (x) => c(x, y)
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const first = <A = never>(): Semigroup<A> => ({
  combine_: (x, _) => x,
  combine: (_) => (x) => x
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const last = <A = never>(): Semigroup<A> => ({
  combine_: (_, y) => y,
  combine: (y) => (_) => y
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const tuple = <T extends ReadonlyArray<unknown>>(
  ...semigroups: { [K in keyof T]: Semigroup<T[K]> }
): Semigroup<Readonly<T>> => {
  return makeSemigroup((x, y) => semigroups.map((s, i) => s.combine_(x[i], y[i])) as any)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const dual = <A>(S: Semigroup<A>): Semigroup<A> => ({
  combine_: (x, y) => S.combine_(y, x),
  combine: (y) => (x) => S.combine_(y, x)
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const fn = <S>(S: Semigroup<S>) => <A = never>(): Semigroup<(a: A) => S> => ({
  combine_: (f, g) => (a) => S.combine_(f(a), g(a)),
  combine: (g) => (f) => (a) => S.combine_(f(a), g(a))
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const struct = <A>(semigroups: { [K in keyof A]: Semigroup<A[K]> }): Semigroup<A> => {
  return makeSemigroup((x, y) => {
    const mut_r: A = {} as any
    const keys     = Object.keys(semigroups)
    for (let i = 0; i < keys.length; i++) {
      const key  = keys[i]
      mut_r[key] = semigroups[key].combine_(x[key], y[key])
    }
    return mut_r
  })
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const min = <A>(O: Ord<A>): Semigroup<A> => {
  return makeSemigroup(min_(O))
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const max = <A>(O: Ord<A>): Semigroup<A> => {
  return makeSemigroup(max_(O))
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const assign = <A extends object = never>(): Semigroup<A> => makeSemigroup((x, y) => Object.assign({}, x, y))

/**
 * @category Instances
 * @since 1.0.0
 */
export const intercalate = <A>(a: A) => (S: Semigroup<A>): Semigroup<A> =>
  makeSemigroup((x, y) => S.combine_(x, S.combine_(a, y)))
