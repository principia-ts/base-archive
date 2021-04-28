import * as P from '@principia/prelude'

export type TypeOf<E> = E extends P.Eq<infer A> ? A : never

/**
 * An alias of `fromEquals` for easy imports
 */
export const makeEq = P.Eq

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export const any: P.Eq<any> = P.Eq(() => true)

export const never: P.Eq<never> = P.Eq(() => false)

export const strict: P.Eq<unknown> = P.Eq((x, y) => x === y)

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: P.Eq<A>, f: (b: B) => A): P.Eq<B> {
  return P.Eq((x, y) => fa.equals_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: P.Eq<A>) => P.Eq<B> {
  return (fa) => contramap_(fa, f)
}

export * from '@principia/prelude/Eq'
