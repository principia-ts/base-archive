import type { UnionToIntersection } from '@principia/base/util/types'

import * as R from '@principia/base/Record'

export type Literal = string | number | boolean | null

const typeOf = (x: unknown): string => (x === null ? 'null' : typeof x)

export function _intersect<A, B>(a: A, b: B): A & B {
  if (a !== undefined && b !== undefined) {
    const tx = typeOf(a)
    const ty = typeOf(b)
    if (tx === 'object' || ty === 'object') {
      return Object.assign({}, a, b)
    }
  }
  return b as any
}

export function memoize<A, B>(f: (a: A) => B): (a: A) => B {
  const cache = new Map()
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a)
      cache.set(a, b)
      return b
    }
    return cache.get(a)
  }
}

export function assignFunction<F extends Function, C>(ab: F, c: C): F & C {
  const newF: typeof ab = ((...x: any[]) => ab(...x)) as any
  return Object.assign(newF, c)
}

export type SelectKeyOfMatchingValues<KeyedValues, Constraint> = {
  [k in keyof KeyedValues]: KeyedValues[k] extends Constraint ? k : never
}[keyof KeyedValues]

export function assignCallable<C, F extends Function & C, D>(F: F, d: D): F & C & D {
  return assignFunction(F, Object.assign({}, F, d))
}

export function wrapFun<A, B, X>(g: ((a: A) => B) & X): typeof g {
  return ((x: any) => g(x)) as any
}

export interface InhabitedTypes<Env, I, E, A, O> {
  _Env: (_: Env) => void
  _I: (_: I) => void
  _E: () => E
  _A: () => A
  _O: () => O
}

export type _I<X extends InhabitedTypes<any, any, any, any, any>> = X['_I']

export type _E<X extends InhabitedTypes<any, any, any, any, any>> = X['_E']

export type _A<X extends InhabitedTypes<any, any, any, any, any>> = X['_A']

export type _O<X extends InhabitedTypes<any, any, any, any, any>> = X['_O']

export type _Env<X extends InhabitedTypes<any, any, any, any, any>> = Parameters<X['_Env']>[0]

export function inhabitTypes<Env, I, E, A, O, T>(t: T): T & InhabitedTypes<Env, I, E, A, O> {
  return t as T & InhabitedTypes<Env, I, E, A, O>
}

type Function1 = (a: any) => any

export type CacheType = <F extends Function1>(f: F) => F

export function cacheUnaryFunction<F extends Function1>(f: F) {
  type K = F extends (a: infer K) => any ? K : any
  type V = F extends (a: any) => infer V ? V : any
  const cache = new Map<K, V>()
  const r     = (key: K): V => {
    const res = cache.get(key)
    if (res !== undefined) {
      return res
    } else {
      const v = f(key)
      cache.set(key, v)
      return v
    }
  }
  return r as F
}

export function mapRecord<
  Dic extends {
    [k in keyof Dic]: any
  },
  B
>(
  d: Dic,
  f: (v: Dic[keyof Dic]) => B
): {
  [k in keyof Dic]: B
} {
  return R.map_(d, f) as {
    [k in keyof Dic]: B
  }
}

export function projectField<T extends R.ReadonlyRecord<any, R.ReadonlyRecord<any, any>>>(t: T) {
  return <K extends keyof T[keyof T]>(
    k: K
  ): {
    [q in keyof T]: T[q][K]
  } =>
    R.map_(t, (p) => p[k]) as {
      [q in keyof T]: T[q][K]
    }
}

export function projectFieldWithEnv<T extends R.ReadonlyRecord<any, (e: R) => R.ReadonlyRecord<any, any>>, R>(
  t: T,
  env: R
) {
  return <K extends keyof ReturnType<T[keyof T]>>(
    k: K
  ): {
    [q in keyof T]: ReturnType<T[q]>[K]
  } =>
    R.map_(t, (p) => p(env)[k]) as {
      [q in keyof T]: ReturnType<T[q]>[K]
    }
}

export function projectWithEnv<T extends R.ReadonlyRecord<any, (_: Env) => R.ReadonlyRecord<string, any>>, Env>(
  t: T,
  env: Env
): {
  [K in keyof T]: ReturnType<T[K]>
} {
  return R.map_(t, (p) => p(env)) as any
}

export type TupleToUnion<T extends unknown[]> = { [P in keyof T]: T[P] } extends {
  [key: number]: infer V
}
  ? V
  : never
export type TupleToIntersection<T extends unknown[]> = UnionToIntersection<TupleToUnion<T>>

export function merge<R extends unknown[]>(...x: [...R]): TupleToIntersection<[...R]> {
  return Object.assign({}, ...x)
}
