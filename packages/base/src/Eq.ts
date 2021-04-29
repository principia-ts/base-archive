export interface Eq<A> {
  readonly equals_: (x: A, y: A) => boolean
  readonly equals: (y: A) => (x: A) => boolean
}

export function Eq<A>(equals: (x: A, y: A) => boolean): Eq<A> {
  const equals_ = (x: A, y: A) => x === y || equals(x, y)
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

export type TypeOf<E> = E extends Eq<infer A> ? A : never

/**
 * An alias of `Eq` for easy imports
 */
export const makeEq = Eq

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export const any: Eq<any> = Eq(() => true)

export const never: Eq<never> = Eq(() => false)

export const strict: Eq<unknown> = Eq((x, y) => x === y)

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: Eq<A>, f: (b: B) => A): Eq<B> {
  return Eq((x, y) => fa.equals_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Eq<A>) => Eq<B> {
  return (fa) => contramap_(fa, f)
}

export { EqURI } from './Modules'
