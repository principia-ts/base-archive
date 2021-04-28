import * as P from '@principia/prelude'

import { memoize } from './function'

export type TypeOf<S> = S extends P.Show<infer A> ? A : never

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export const any: P.Show<any> = {
  show: (a) => JSON.stringify(a)
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: P.Show<A>, f: (b: B) => A): P.Show<B> {
  return P.Show((b) => fa.show(f(b)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: P.Show<A>) => P.Show<B> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function struct<A extends Record<PropertyKey, P.Show<any>>>(
  properties: A
): P.Show<{ readonly [K in keyof A]: TypeOf<A[K]> }> {
  return {
    show: (a) =>
      `{ ${Object.keys(properties)
        .map((k) => `${k}: ${properties[k].show(a[k])}`)
        .join(', ')} }`
  }
}

export function tuple<A extends ReadonlyArray<P.Show<any>>>(
  ...components: A
): P.Show<Readonly<{ [i in keyof A]: TypeOf<A[i]> }>> {
  return {
    show: (t) => `[${t.map((a, i) => components[i].show(a)).join(', ')}]`
  }
}

export function named_<A>(show: P.Show<A>, name: string | undefined): P.Show<A> {
  return P.Show((a) => (typeof name !== 'undefined' ? `<${name}>(${show.show(a)})` : show.show(a)))
}

export function named(name: string | undefined): <A>(show: P.Show<A>) => P.Show<A> {
  return (show) => named_(show, name)
}

export function nullable<A>(or: P.Show<A>): P.Show<A | null> {
  return P.Show((a) => (a === null ? 'null' : or.show(a)))
}

export function undefinable<A>(or: P.Show<A>): P.Show<A | undefined> {
  return P.Show((a) => (typeof a === 'undefined' ? 'undefined' : or.show(a)))
}

export function partial<A extends Record<PropertyKey, P.Show<any>>>(
  properties: A
): P.Show<
  Partial<
    Readonly<
      {
        [K in keyof A]: TypeOf<A[K]>
      }
    >
  >
> {
  const mut_r = {} as any
  for (const k in properties) {
    mut_r[k] = undefinable(properties[k])
  }
  return struct(mut_r) as any
}

export function intersect_<A, B>(left: P.Show<A>, right: P.Show<B>): P.Show<A & B> {
  return P.Show((a) => `${left.show(a)} & ${right.show(a)}`)
}

export function intersect<B>(right: P.Show<B>): <A>(left: P.Show<A>) => P.Show<A & B> {
  return (left) => intersect_(left, right)
}

export function sum_<T extends string, A>(
  tag: T,
  members: {
    [K in keyof A]: P.Show<A[K] & Record<T, K>>
  }
): P.Show<A[keyof A]> {
  return P.Show((a: Readonly<Record<string, any>>) => members[a[tag]].show(a))
}

export function sum<T extends string>(
  tag: T
): <A>(members: { [K in keyof A]: P.Show<A[K] & Record<T, K>> }) => P.Show<A[keyof A]> {
  return (members) => sum_(tag, members)
}

export function lazy<A>(f: () => P.Show<A>): P.Show<A> {
  const get = memoize<void, P.Show<A>>(f)
  return P.Show((a) => get().show(a))
}

export * from '@principia/prelude/Show'
