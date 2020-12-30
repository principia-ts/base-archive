import type * as HKT from '@principia/base/HKT'

import { identity, memoize } from '@principia/base/data/Function'

import { _intersect } from './util'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Encoder<O, A> {
  readonly encode: (a: A) => O
}

export type OutputOf<E> = E extends Encoder<infer O, any> ? O : never

export type TypeOf<E> = E extends Encoder<any, infer A> ? A : never

export const URI = 'Encoder'

export type URI = typeof URI

export type V = HKT.V<'E', '+'>

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Encoder<E, A>
  }
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<E, A, B>(ab: Encoder<A, B>, ea: Encoder<E, A>): Encoder<E, B> {
  return contramap_(ea, ab.encode)
}

export function compose<E, A>(ea: Encoder<E, A>): <B>(ab: Encoder<A, B>) => Encoder<E, B> {
  return (ab) => compose_(ab, ea)
}

export function id<A>(): Encoder<A, A> {
  return {
    encode: identity
  }
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<E, A, B>(fa: Encoder<E, A>, f: (b: B) => A): Encoder<E, B> {
  return {
    encode: (b) => fa.encode(f(b))
  }
}

export function contramap<A, B>(f: (b: B) => A): <E>(fa: Encoder<E, A>) => Encoder<E, B> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function nullable<O, A>(or: Encoder<O, A>): Encoder<null | O, null | A> {
  return {
    encode: (a) => (a === null ? null : or.encode(a))
  }
}

export function type<P extends Record<string, Encoder<any, any>>>(
  properties: P
): Encoder<
  {
    [K in keyof P]: OutputOf<P[K]>
  },
  {
    [K in keyof P]: TypeOf<P[K]>
  }
> {
  return {
    encode: (a) => {
      const o: Record<keyof P, any> = {} as any
      for (const k in properties) {
        o[k] = properties[k].encode(a[k])
      }
      return o
    }
  }
}

export function partial<P extends Record<string, Encoder<any, any>>>(
  properties: P
): Encoder<
  Partial<
    {
      [K in keyof P]: OutputOf<P[K]>
    }
  >,
  Partial<
    {
      [K in keyof P]: TypeOf<P[K]>
    }
  >
> {
  return {
    encode: (a) => {
      const o: Record<keyof P, any> = {} as any
      for (const k in properties) {
        const v = a[k]
        // don't add missing properties
        if (k in a) {
          // don't strip undefined properties
          o[k] = v === undefined ? undefined : properties[k].encode(v)
        }
      }
      return o
    }
  }
}

export function record<O, A>(codomain: Encoder<O, A>): Encoder<Record<string, O>, Record<string, A>> {
  return {
    encode: (r) => {
      const o: Record<string, O> = {}
      for (const k in r) {
        o[k] = codomain.encode(r[k])
      }
      return o
    }
  }
}

export function array<O, A>(item: Encoder<O, A>): Encoder<ReadonlyArray<O>, ReadonlyArray<A>> {
  return {
    encode: (as) => as.map(item.encode)
  }
}

export function tuple<C extends ReadonlyArray<Encoder<any, any>>>(
  ...components: C
): Encoder<
  {
    [K in keyof C]: OutputOf<C[K]>
  },
  {
    [K in keyof C]: TypeOf<C[K]>
  }
> {
  return {
    encode: (as) => components.map((c, i) => c.encode(as[i])) as any
  }
}

export function intersect<P, B>(right: Encoder<P, B>): <O, A>(left: Encoder<O, A>) => Encoder<O & P, A & B> {
  return (left) => ({
    encode: (ab) => _intersect(left.encode(ab), right.encode(ab))
  })
}

export function sum_<T extends string, MS extends Record<string, Encoder<any, any>>>(
  tag: T,
  members: MS
): Encoder<OutputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> {
  return {
    encode: (a) => members[a[tag]].encode(a)
  }
}

export function sum<T extends string>(
  tag: T
): <MS extends Record<string, Encoder<any, any>>>(
  members: MS
) => Encoder<OutputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> {
  return (members) => ({
    encode: (a) => members[a[tag]].encode(a)
  })
}

export function lazy<O, A>(f: () => Encoder<O, A>): Encoder<O, A> {
  const get = memoize<void, Encoder<O, A>>(f)
  return {
    encode: (a) => get().encode(a)
  }
}
