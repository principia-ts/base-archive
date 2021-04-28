/**
 * Operations on heterogeneous records
 */
import type * as Eq from './Eq'
import type { ReadonlyRecord } from './Record'
import type * as HKT from '@principia/prelude/HKT'

import * as P from '@principia/prelude'

import * as A from './Array/core'
import * as R from './Record'
import * as Str from './string'

type Eq<A> = Eq.Eq<A>

/*
 * -------------------------------------------
 * *** experimental ***
 * -------------------------------------------
 */

type EnsureLiteral<K> = string extends K ? never : [K] extends [P.UnionToIntersection<K>] ? K : never

type TestLiteral<K> = string extends K ? unknown : [K] extends [P.UnionToIntersection<K>] ? K : unknown

type EnsureNonexistentProperty<T, K extends string> = Extract<keyof T, K> extends never ? T : never

type EnsureLiteralKeys<S> = string extends keyof S ? never : S

type EnsureLiteralTuple<A extends ReadonlyArray<unknown>> = unknown extends {
  [K in keyof A]: A[K] extends string ? TestLiteral<A[K]> : unknown
}[number]
  ? never
  : A

/**
 * Inserts a key value pair into a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function insertAt_<S extends ReadonlyRecord<string, any>, K extends string, A>(
  s: EnsureNonexistentProperty<S, K>,
  k: EnsureLiteral<K>,
  a: A
): { [P in keyof S | K]: P extends keyof S ? S[P] : A } {
  return {
    ...s,
    [k]: a
  }
}

/**
 * Inserts a key value pair into a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function insertAt<K extends string, A>(
  k: EnsureLiteral<K>,
  a: A
): <S extends ReadonlyRecord<string, any>>(
  s: EnsureNonexistentProperty<S, K>
) => { [P in keyof S | K]: P extends keyof S ? S[P] : A } {
  return (s) => insertAt_(s, k, a)
}

/**
 * Replaces a value in a struct if it exists, or inserts if it does not
 *
 * @category combinators
 * @since 1.0.0
 */
export function upsertAt_<S extends ReadonlyRecord<string, any>, K extends string, A>(
  s: S,
  k: EnsureLiteral<K>,
  a: A
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A } {
  if (R.has_(s, k) && s[k] === a) {
    return s
  }
  return {
    ...s,
    [k]: a
  }
}

/**
 * Replaces a value in a struct if it exists, or inserts if it does not
 *
 * @category combinators
 * @since 1.0.0
 */
export function upsertAt<K extends string, A>(
  k: EnsureLiteral<K>,
  a: A
): <S extends ReadonlyRecord<string, any>>(
  s: S
) => { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A } {
  return (s) => upsertAt_(s, k, a)
}

/**
 * Maps over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt_<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  s: S,
  k: K,
  f: (a: S[K]) => B
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
  return {
    ...s,
    [k]: f(s[k])
  }
}

/**
 * Maps over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt<S, K extends keyof S extends never ? string : keyof S, A, B>(
  k: keyof S extends never ? EnsureLiteral<K> : K,
  f: (a: K extends keyof S ? S[K] : A) => B
): <S1 extends { [P in K]: A }>(
  s: keyof S extends never ? S1 : S
) => K extends keyof S
  ? { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }
  : { readonly [P in Exclude<keyof S1, K> | K]: P extends Exclude<keyof S1, K> ? S1[P] : B } {
  return (s) => modifyAt_(s, k as any, f as any) as any
}

/**
 * Effectfully map over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAtE_<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): <S_ extends ReadonlyRecord<string, any>, K_ extends keyof S_, N extends string, K, Q, W, X, I, S, R, E, B>(
  s: S_,
  k: K_,
  f: (a: S_[K_]) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
) => HKT.Kind<
  F,
  C,
  N,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  { readonly [P in Exclude<keyof S_, K_> | K_]: P extends Exclude<keyof S_, K_> ? S_[P] : B }
> {
  return (s, k, f) =>
    F.map_(f(s[k]), (b) => ({
      ...s,
      [k]: b
    }))
}

export function modifyAtE<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): <S_, K_ extends keyof S_ extends never ? string : keyof S, N extends string, K, Q, W, X, I, S, R, E, A, B>(
  k: keyof S_ extends never ? EnsureLiteral<K_> : K_,
  f: (a: K_ extends keyof S_ ? S_[K_] : A) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
) => <S1 extends { [K in K_]: A }>(
  s: keyof S_ extends never ? S1 : S_
) => HKT.Kind<
  F,
  C,
  N,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  K_ extends keyof S_
    ? { readonly [P in Exclude<keyof S_, K_> | K_]: P extends Exclude<keyof S_, K_> ? S_[P] : B }
    : {
        readonly [P in Exclude<keyof S1, K_> | K_]: P extends Exclude<keyof S1, K_> ? S1[P] : B
      }
> {
  const modifyAtEF_ = modifyAtE_(F)
  return (k, f) => (s) => modifyAtEF_(s, k as any, f as any)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt_<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  s: S,
  k: K,
  b: B
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
  return modifyAt_(s, k, () => b)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt<S, K extends keyof S extends never ? string : keyof S, B>(
  k: keyof S extends never ? EnsureLiteral<K> : K,
  b: B
): <S1 extends { [P in K]: any }>(
  s: keyof S extends never ? S1 : S
) => K extends keyof S
  ? { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }
  : { readonly [P in Exclude<keyof S1, K> | K]: P extends Exclude<keyof S1, K> ? S1[P] : B } {
  return (s) => modifyAt_(s, k as any, () => b) as any
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function hmap_<S extends ReadonlyRecord<string, any>, F extends { [K in keyof S]: (a: S[K]) => any }>(
  s: S,
  fs: F
): { readonly [K in keyof F]: ReturnType<F[K]> } {
  const keys    = R.keys(s)
  const mut_out = {} as any
  for (let i = 0; i < keys.length; i++) {
    const key    = keys[i]
    mut_out[key] = fs[key](s[key])
  }
  return mut_out
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function hmap<
  S,
  F extends keyof S extends never ? Record<string, (a: any) => any> : { [K in keyof S]: (a: S[K]) => any }
>(
  fs: keyof F extends never ? EnsureLiteralKeys<F> : F
): <S1 extends { [K in keyof F]: Parameters<F[K]>[0] }>(
  s: keyof S extends never ? S1 : S
) => { readonly [K in keyof F]: ReturnType<F[K]> } {
  return (s) => hmap_(s, fs as any) as any
}

export function pick_<S extends ReadonlyRecord<string, any>>(s: S) {
  return <K extends ReadonlyArray<keyof S>>(...keys: K): { [P in K[number]]: S[P] } => {
    const mut_out = {} as Pick<S, K[number]>
    for (let i = 0; i < keys.length; i++) {
      const key    = keys[i]
      mut_out[key] = s[key]
    }
    return mut_out
  }
}

export function pick<S, K extends ReadonlyArray<keyof S extends never ? string : keyof S>>(
  ...keys: keyof S extends never ? EnsureLiteralTuple<K> : K
): <S1 extends { [P in K[number]]: any }>(
  s: keyof S extends never ? S1 : S
) => K[number] extends keyof S ? { readonly [P in K[number]]: S[P] } : { readonly [P in K[number]]: S1[P] } {
  return (s) => pick_(s)(...(keys as any)) as any
}

export function omit_<S extends ReadonlyRecord<string, any>>(s: S) {
  return <K extends ReadonlyArray<keyof S>>(...keys: K): { [P in Exclude<keyof S, K[number]>]: S[P] } => {
    const newKeys = A.difference_(Str.Eq)(R.keys(s), keys as ReadonlyArray<string>)
    const mut_out = {} as Omit<S, K[number]>
    for (let i = 0; i < newKeys.length; i++) {
      const key    = newKeys[i]
      mut_out[key] = s[key]
    }
    return mut_out
  }
}

export function omit<S, K extends ReadonlyArray<keyof S extends never ? string : keyof S>>(
  ...keys: keyof S extends never ? EnsureLiteralTuple<K> : K
): <S1 extends { [P in K[number]]: any }>(
  s: keyof S extends never ? S1 : S
) => K[number] extends keyof S
  ? { readonly [P in Exclude<keyof S, K[number]>]: S[P] }
  : { readonly [P in Exclude<keyof S1, K[number]>]: S1[P] } {
  return (s) => omit_(s)(...(keys as any)) as any
}

export function getEq<P extends Record<PropertyKey, P.Eq<any>>>(
  properties: P
): Eq<Readonly<{ [K in keyof P]: Eq.TypeOf<P[K]> }>> {
  return P.Eq((x, y) => {
    for (const k in properties) {
      if (!properties[k].equals_(x[k], y[k])) {
        return false
      }
    }
    return true
  })
}
