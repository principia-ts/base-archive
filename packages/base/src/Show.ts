import type { ReadonlyRecord } from './Record'

import { memoize, pipe } from './Function'
import * as R from './Record'

export interface Show<A> {
  readonly show: (a: A) => string
}

export function makeShow<A>(show: (a: A) => string): Show<A> {
  return {
    show
  }
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export const any: Show<any> = {
  show: (a) => JSON.stringify(a)
}

export const string: Show<string> = any

export const number: Show<number> = any

export const boolean: Show<boolean> = any

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: Show<A>, f: (b: B) => A): Show<B> {
  return makeShow((b) => fa.show(f(b)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Show<A>) => Show<B> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function struct<O extends Readonly<Record<string, any>>>(
  shows: {
    [K in keyof O]: Show<O[K]>
  }
): Show<O> {
  return {
    show: (a) =>
      `{ ${Object.keys(shows)
        .map((k) => `${k}: ${shows[k].show(a[k])}`)
        .join(', ')} }`
  }
}

export function tuple<T extends ReadonlyArray<Show<any>>>(
  ...shows: T
): Show<
  {
    [K in keyof T]: T[K] extends Show<infer A> ? A : never
  }
> {
  return {
    show: (t) => `[${t.map((a, i) => shows[i].show(a)).join(', ')}]`
  }
}

export function named_<A>(show: Show<A>, name: string | undefined): Show<A> {
  return makeShow((a) => (typeof name !== 'undefined' ? `<${name}>(${show.show(a)})` : show.show(a)))
}

export function named(name: string | undefined): <A>(show: Show<A>) => Show<A> {
  return (show) => named_(show, name)
}

export function nullable<A>(or: Show<A>): Show<A | null> {
  return makeShow((a) => (a === null ? 'null' : or.show(a)))
}

export function undefinable<A>(or: Show<A>): Show<A | undefined> {
  return makeShow((a) => (typeof a === 'undefined' ? 'undefined' : or.show(a)))
}

export const type: <A extends Readonly<Record<string, any>>>(
  shows: { [K in keyof A]: Show<A[K]> }
) => Show<{ [K in keyof A]: A[K] }> = struct

export function partial<A extends Readonly<Record<string, any>>>(
  properties: {
    [K in keyof A]: Show<A[K]>
  }
): Show<
  Partial<
    {
      [K in keyof A]: A[K]
    }
  >
> {
  return pipe(
    properties,
    R.map((s: Show<any>) => undefinable(s)),
    type
  )
}

export function intersect_<A, B>(left: Show<A>, right: Show<B>): Show<A & B> {
  return makeShow((a) => `${left.show(a)} & ${right.show(a)}`)
}

export function intersect<B>(right: Show<B>): <A>(left: Show<A>) => Show<A & B> {
  return (left) => intersect_(left, right)
}

export function sum_<T extends string, A>(
  tag: T,
  members: {
    [K in keyof A]: Show<A[K] & Record<T, K>>
  }
): Show<A[keyof A]> {
  return makeShow((a: ReadonlyRecord<string, any>) => members[a[tag]].show(a))
}

export function sum<T extends string>(
  tag: T
): <A>(members: { [K in keyof A]: Show<A[K] & Record<T, K>> }) => Show<A[keyof A]> {
  return (members) => sum_(tag, members)
}

export function lazy<A>(f: () => Show<A>): Show<A> {
  const get = memoize<void, Show<A>>(f)
  return makeShow((a) => get().show(a))
}
