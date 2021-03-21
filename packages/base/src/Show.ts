import type { ReadonlyRecord } from './Record'

import { memoize } from './function'

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

export function struct<A>(
  shows: {
    [K in keyof A]: Show<A[K]>
  }
): Show<{ readonly [K in keyof A]: A[K] }> {
  return {
    show: (a) =>
      `{ ${Object.keys(shows)
        .map((k) => `${k}: ${shows[k].show(a[k])}`)
        .join(', ')} }`
  }
}

export function tuple<A extends ReadonlyArray<unknown>>(...shows: { [K in keyof A]: Show<A[K]> }): Show<Readonly<A>> {
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
  const mut_r = {} as any
  for (const k in properties) {
    mut_r[k] = undefinable(properties[k])
  }
  return struct(mut_r) as any
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
