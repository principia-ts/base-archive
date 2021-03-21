/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

import type { ReadonlyRecord } from './Record'
import type { Refinement } from './Refinement'
import type { Primitive } from './util/types'

import { memoize, pipe } from './function'

export interface Guard<I, A extends I> {
  is: (i: I) => i is A
}

export type TypeOf<G> = G extends Guard<any, infer A> ? A : never

export type InputOf<G> = G extends Guard<infer I, any> ? I : never

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeGuard<I, A extends I>(is: (u: I) => u is A): Guard<I, A> {
  return { is }
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function literal<A extends readonly [Primitive, ...Array<Primitive>]>(...values: A): Guard<unknown, A[number]> {
  return {
    is: (u): u is A[number] => values.findIndex((a) => a === u) !== -1
  }
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function refine<I, A extends I, B extends A>(refinement: Refinement<A, B>): (from: Guard<I, A>) => Guard<I, B> {
  return (from) => ({
    is: (u): u is B => from.is(u) && refinement(u)
  })
}

export function nullable<I, A extends I>(or: Guard<I, A>): Guard<null | I, null | A> {
  return {
    is: (u): u is null | A => u === null || or.is(u)
  }
}

export function struct<A>(
  properties: {
    [K in keyof A]: Guard<unknown, A[K]>
  }
): Guard<
  unknown,
  {
    [K in keyof A]: A[K]
  }
> {
  return pipe(
    UnknownRecord,
    refine((r): r is {
      [K in keyof A]: A[K]
    } => {
      for (const k in properties) {
        if (!(k in r) || !properties[k].is(r[k])) {
          return false
        }
      }
      return true
    })
  )
}

export function partial<A>(
  properties: {
    [K in keyof A]: Guard<unknown, A[K]>
  }
): Guard<
  unknown,
  Partial<
    {
      [K in keyof A]: A[K]
    }
  >
> {
  return pipe(
    UnknownRecord,
    refine((r): r is Partial<A> => {
      for (const k in properties) {
        const v = r[k]
        if (v !== undefined && !properties[k].is(r[k])) {
          return false
        }
      }
      return true
    })
  )
}

export function tuple<A extends ReadonlyArray<unknown>>(
  ...components: {
    [K in keyof A]: Guard<unknown, A[K]>
  }
): Guard<unknown, A> {
  return {
    is: (u): u is A =>
      Array.isArray(u) && u.length === components.length && components.every((g, index) => g.is(u[index]))
  }
}

export function intersect<B>(right: Guard<unknown, B>) {
  return <A>(left: Guard<unknown, A>): Guard<unknown, A & B> => ({
    is: (u): u is A & B => left.is(u) && right.is(u)
  })
}

export function union<A extends readonly [unknown, ...Array<unknown>]>(
  ...members: {
    [K in keyof A]: Guard<unknown, A[K]>
  }
): Guard<unknown, A[number]> {
  return {
    is: (u): u is A | A[number] => members.some((m) => m.is(u))
  }
}

export function sum<T extends string>(tag: T) {
  return <A>(
    members: {
      [K in keyof A]: Guard<unknown, A[K] & Record<T, K>>
    }
  ): Guard<unknown, A[keyof A]> =>
    pipe(
      UnknownRecord,
      refine((r): r is any => {
        const v = r[tag] as keyof A
        if (v in members) {
          return members[v].is(r)
        }
        return false
      })
    )
}

export function lazy<A>(f: () => Guard<unknown, A>): Guard<unknown, A> {
  const get = memoize<void, Guard<unknown, A>>(f)
  return {
    is: (u): u is A => get().is(u)
  }
}

export function alt_<I, A extends I>(me: Guard<I, A>, that: () => Guard<I, A>): Guard<I, A> {
  return {
    is: (i): i is A => me.is(i) || that().is(i)
  }
}

export function alt<I, A extends I>(that: () => Guard<I, A>): (me: Guard<I, A>) => Guard<I, A> {
  return (me) => alt_(me, that)
}

export function zero<I, A extends I>(): Guard<I, A> {
  return {
    is: (_): _ is A => false
  }
}

export function compose_<I, A extends I, B extends A>(from: Guard<I, A>, to: Guard<A, B>): Guard<I, B> {
  return {
    is: (i): i is B => from.is(i) && to.is(i)
  }
}

export function compose<I, A extends I, B extends A>(to: Guard<A, B>): (from: Guard<I, A>) => Guard<I, B> {
  return (from) => compose_(from, to)
}

export function id<A>(): Guard<A, A> {
  return {
    is: (_): _ is A => true
  }
}

export { GuardURI } from './Modules'

/*
 * -------------------------------------------
 * Internal
 * -------------------------------------------
 */

/**
 * @category Primitives
 * @since 1.0.0
 * @internal
 */
const UnknownRecord: Guard<unknown, ReadonlyRecord<string, unknown>> = {
  is: (i): i is Record<string, unknown> => i != null && typeof i === 'object' && !Array.isArray(i)
}
