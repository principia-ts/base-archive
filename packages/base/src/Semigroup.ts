import * as P from '@principia/prelude'

import * as Ord from './Ord'

/**
 * @category Instances
 * @since 1.0.0
 */
export const first = <A = never>(): P.Semigroup<A> => ({
  combine_: (x, _) => x,
  combine: (_) => (x) => x
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const last = <A = never>(): P.Semigroup<A> => ({
  combine_: (_, y) => y,
  combine: (y) => (_) => y
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const tuple = <T extends ReadonlyArray<unknown>>(
  ...semigroups: { [K in keyof T]: P.Semigroup<T[K]> }
): P.Semigroup<Readonly<T>> => {
  return P.Semigroup((x, y) => semigroups.map((s, i) => s.combine_(x[i], y[i])) as any)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const dual = <A>(S: P.Semigroup<A>): P.Semigroup<A> => ({
  combine_: (x, y) => S.combine_(y, x),
  combine: (y) => (x) => S.combine_(y, x)
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const fn = <S>(S: P.Semigroup<S>) => <A = never>(): P.Semigroup<(a: A) => S> => ({
  combine_: (f, g) => (a) => S.combine_(f(a), g(a)),
  combine: (g) => (f) => (a) => S.combine_(f(a), g(a))
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const struct = <A>(semigroups: { [K in keyof A]: P.Semigroup<A[K]> }): P.Semigroup<A> => {
  return P.Semigroup((x, y) => {
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
export const min = <A>(O: P.Ord<A>): P.Semigroup<A> => {
  return P.Semigroup(Ord.min_(O))
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const max = <A>(O: P.Ord<A>): P.Semigroup<A> => {
  return P.Semigroup(Ord.max_(O))
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const assign = <A extends object = never>(): P.Semigroup<A> => P.Semigroup((x, y) => Object.assign({}, x, y))

/**
 * @category Instances
 * @since 1.0.0
 */
export const intercalate = <A>(a: A) => (S: P.Semigroup<A>): P.Semigroup<A> =>
  P.Semigroup((x, y) => S.combine_(x, S.combine_(a, y)))
