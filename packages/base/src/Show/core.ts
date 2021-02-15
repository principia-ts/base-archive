/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Show<A> {
  readonly show: (a: A) => string
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

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
