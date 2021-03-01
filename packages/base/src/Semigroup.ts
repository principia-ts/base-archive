import type { Ord } from './Ord'

import { max_, min_ } from './Ord'

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
export interface Semigroup<A> {
  readonly combine_: CombineFn_<A>
  readonly combine: CombineFn<A>
}

export interface CombineFn_<A> {
  (x: A, y: A): A
}

export interface CombineFn<A> {
  (y: A): (x: A) => A
}

export const makeSemigroup = <A>(c: (x: A, y: A) => A): Semigroup<A> => ({
  combine_: c,
  combine: (y) => (x) => c(x, y)
})

/**
 * Boolean semigroup under conjunction
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupAll: Semigroup<boolean> = {
  combine_: (x, y) => x && y,
  combine: (y) => (x) => x && y
}

/**
 * Boolean semigroup under disjunction
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupAny: Semigroup<boolean> = {
  combine_: (x, y) => x || y,
  combine: (y) => (x) => x || y
}

/**
 * Number `Semigroup` under addition
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupSum: Semigroup<number> = {
  combine_: (x, y) => x + y,
  combine: (x) => (y) => x + y
}

/**
 * Number `Semigroup` under multiplication
 *
 * @category Instances
 * @since 1.0.0
 */
export const semigroupProduct: Semigroup<number> = {
  combine_: (x, y) => x * y,
  combine: (y) => (x) => x * y
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const semigroupString: Semigroup<string> = {
  combine_: (x, y) => x + y,
  combine: (y) => (x) => x + y
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const semigroupVoid: Semigroup<void> = {
  combine_: () => undefined,
  combine: () => () => undefined
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFirstSemigroup = <A = never>(): Semigroup<A> => ({
  combine_: (x, _) => x,
  combine: (_) => (x) => x
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const getLastSemigroup = <A = never>(): Semigroup<A> => ({
  combine_: (_, y) => y,
  combine: (y) => (_) => y
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const getTupleSemigroup = <T extends ReadonlyArray<Semigroup<any>>>(
  ...semigroups: T
): Semigroup<{ [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }> => {
  const combine_: CombineFn_<{ [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }> = (x, y) =>
    semigroups.map((s, i) => s.combine_(x[i], y[i])) as any
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const getDualSemigroup = <A>(S: Semigroup<A>): Semigroup<A> => ({
  combine_: (x, y) => S.combine_(y, x),
  combine: (y) => (x) => S.combine_(y, x)
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFunctionSemigroup = <S>(S: Semigroup<S>) => <A = never>(): Semigroup<(a: A) => S> => ({
  combine_: (f, g) => (a) => S.combine_(f(a), g(a)),
  combine: (g) => (f) => (a) => S.combine_(f(a), g(a))
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const getStructSemigroup = <O extends Readonly<Record<string, any>>>(
  semigroups: { [K in keyof O]: Semigroup<O[K]> }
): Semigroup<O> => {
  const combine_: CombineFn_<O> = (x, y) => {
    const mut_r: any = {}
    for (const key of Object.keys(semigroups)) {
      mut_r[key] = semigroups[key].combine_(x[key], y[key])
    }
    return mut_r
  }
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const getMeetSemigroup = <A>(O: Ord<A>): Semigroup<A> => {
  const minO = min_(O)
  return {
    combine_: (x, y) => minO(x, y),
    combine: (y) => (x) => minO(x, y)
  }
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const getJoinSemigroup = <A>(O: Ord<A>): Semigroup<A> => {
  const maxO = max_(O)
  return {
    combine_: (x, y) => maxO(x, y),
    combine: (y) => (x) => maxO(x, y)
  }
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const getObjectSemigroup = <A extends object = never>(): Semigroup<A> => ({
  combine_: (x, y) => Object.assign({}, x, y),
  combine: (y) => (x) => Object.assign({}, x, y)
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const getIntercalateSemigroup = <A>(a: A) => (S: Semigroup<A>): Semigroup<A> => ({
  combine_: (x, y) => S.combine_(x, S.combine_(a, y)),
  combine: (y) => (x) => S.combine_(x, S.combine_(a, y))
})
