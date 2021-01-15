import type { ReadonlyRecord } from '../Record'

export const URI = 'Eq'
export type URI = typeof URI

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Eq<A> {
  readonly equals_: (x: A, y: A) => boolean
  readonly equals: (y: A) => (x: A) => boolean
}

declare module '../HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Eq<A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeEq<A>(equals: (x: A, y: A) => boolean): Eq<A> {
  const equals_ = (x: A, y: A) => x === y || equals(x, y)
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export const eqAny: Eq<any> = {
  equals_: () => true,
  equals: () => () => true
}

export const eqStrict: Eq<unknown> = {
  equals_: (x, y) => x === y,
  equals: (y) => (x) => x === y
}

export const string: Eq<string> = eqStrict

export const number: Eq<number> = eqStrict

export const boolean: Eq<boolean> = eqStrict

export const date: Eq<Date> = {
  equals_: (x, y) => x.valueOf() === y.valueOf(),
  equals: (y) => (x) => x.valueOf() === y.valueOf()
}

export const UnknownArray: Eq<ReadonlyArray<unknown>> = makeEq((x, y) => x.length === y.length)

export const UnknownRecord: Eq<ReadonlyRecord<string, unknown>> = makeEq((x, y) => {
  for (const k in x) {
    if (!(k in y)) {
      return false
    }
  }
  for (const k in y) {
    if (!(k in x)) {
      return false
    }
  }
  return true
})

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: Eq<A>, f: (b: B) => A): Eq<B> {
  return makeEq((x, y) => fa.equals_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Eq<A>) => Eq<B> {
  return (fa) => contramap_(fa, f)
}
