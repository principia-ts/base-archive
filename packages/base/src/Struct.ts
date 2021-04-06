/**
 * Operations on heterogeneous records
 */
import type { ReadonlyRecord } from './Record'
import type { EnsureLiteral } from './util/types'

import * as A from './Array'
import * as R from './Record'
import * as Str from './string'

/*
 * -------------------------------------------
 * *** experimental ***
 * -------------------------------------------
 */

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
export function modifyAt<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  k: K,
  f: (a: S[K]) => B
): (s: S) => { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
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
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
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
): (s: S) => { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
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

export function pick<S extends ReadonlyRecord<string, any>, K extends ReadonlyArray<keyof S>>(
  ...keys: K
): (s: S) => { [P in K[number]]: S[P] } {
  return (s) => pick_(s)(...keys)
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

export function omit<S extends ReadonlyRecord<string, any>, K extends ReadonlyArray<keyof S>>(
  ...keys: K
): (s: S) => { [P in Exclude<keyof S, K[number]>]: S[P] } {
  return (s) => omit_(s)(...keys)
}
