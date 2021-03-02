import type { ReadonlyRecord } from './Record'
import type { EnsureLiteral } from './util/types'

import * as R from './Record'

/*
 * -------------------------------------------
 * *** experimental ***
 * -------------------------------------------
 */

type Flat<T> = { [K in keyof T]: T[K] } & {}

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

export function upsertAt<K extends string, A>(
  k: EnsureLiteral<K>,
  a: A
): <S extends ReadonlyRecord<string, any>>(
  s: S
) => Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: A }> {
  return (s) => upsertAt_(s, k, a)
}

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

export function modifyAt<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  k: K,
  f: (a: S[K]) => B
): (s: S) => Flat<{ readonly [P in Exclude<keyof S, K>]: S[P] } & { readonly [key in K]: B }> {
  return (s) => modifyAt_(s, k, f)
}
