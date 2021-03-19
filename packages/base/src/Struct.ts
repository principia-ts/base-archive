/**
 * Operations on heterogeneous records
 */
import type { ReadonlyRecord } from './Record'
import type { EnsureLiteral } from './util/types'

import * as R from './Record'

/*
 * -------------------------------------------
 * *** experimental ***
 * -------------------------------------------
 */

type Flat<T> = { [K in keyof T]: T[K] } & {}

type EnsureNonexistentProperty<T, K extends string> = Extract<keyof T, K> extends never ? T : never

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
): Flat<S & { readonly [key in K]: A }> {
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
): <S extends ReadonlyRecord<string, any>>(s: EnsureNonexistentProperty<S, K>) => Flat<S & { readonly [key in K]: A }> {
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
): Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: A }> {
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
) => Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: A }> {
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
): Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: B }> {
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
export function modifyAt<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  k: K,
  f: (a: S[K]) => B
): (s: S) => Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: B }> {
  return (s) => modifyAt_(s, k, f)
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
): Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: B }> {
  return modifyAt_(s, k, () => b)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  k: K,
  b: B
): (s: S) => Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: B }> {
  return (s) => modifyAt_(s, k, () => b)
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
export function hmap<S extends ReadonlyRecord<string, any>, F extends { [K in keyof S]: (a: S[K]) => any }>(
  fs: F
): (s: S) => { readonly [K in keyof F]: ReturnType<F[K]> } {
  return (s) => hmap_(s, fs)
}
