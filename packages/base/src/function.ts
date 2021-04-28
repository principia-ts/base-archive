import * as P from '@principia/prelude'

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

/**
 * @since 1.0.0
 */
export function absurd<A>(_: never): A {
  throw new Error('Called `absurd` function, which should be uncallable.')
}

/**
 * Applies an argument to a function
 *
 * @section utils
 * @since 1.0.0
 */
export function apply<A>(a: A): <B>(f: (a: A) => B) => B {
  return (f) => f(a)
}

/**
 * @since 1.0.0
 */
export function constant<A>(a: A): P.Lazy<A> {
  return () => a
}

/**
 * A thunk that always returns `true`.
 *
 * @since 1.0.0
 */
export const constTrue: P.Lazy<true> = () => true

/**
 * A thunk that always returns `false`.
 *
 * @since 1.0.0
 */
export const constFalse: P.Lazy<false> = () => false

/**
 * A thunk that always returns `null`.
 *
 * @since 1.0.0
 */
export const constNull: P.Lazy<null> = () => null

/**
 * A thunk that always returns `undefined`.
 *
 * @since 1.0.0
 */
export const constUndefined: P.Lazy<undefined> = () => undefined

/**
 * A thunk that always returns `undefined`.
 *
 * @since 1.0.0
 */
export const constVoid: P.Lazy<void> = constUndefined

/**
 * @since 1.0.0
 */
export function decrement(n: number): number {
  return n - 1
}

/**
 * Flips the arguments of an uncurried binary function
 *
 * @section utils
 * @since 1.0.0
 */
export function flip_<A, B, C>(f: (a: A, b: B) => C): (b: B, a: A) => C {
  return (b, a) => f(a, b)
}

/**
 * Flips the arguments of a curried binary function
 *
 * @section utils
 * @since 1.0.0
 */
export function flip<A, B, C>(f: (a: A) => (b: B) => C): (b: B) => (a: A) => C {
  return (b) => (a) => f(a)(b)
}

/**
 * Type hole simulation
 *
 * @since 1.0.0
 */
export const hole: <T>() => T = absurd as any

/**
 * Performs an `if-else` computation based on the given refinement or predicate
 *
 * @section utils
 * @since 1.0.0
 */
export function if_<A, B extends A, C, D>(
  a: A,
  refinement: P.Refinement<A, B>,
  onTrue: (a: B) => C,
  onFalse: (a: A) => D
): C | D
export function if_<A, B, C>(a: A, predicate: P.Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => C): B | C
export function if_<A, B, C>(a: A, predicate: P.Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => C): B | C {
  return predicate(a) ? onTrue(a) : onFalse(a)
}

/**
 * Performs an `if-else` computation based on the given refinement or predicate
 *
 * @section utils
 * @since 1.0.0
 */
function _if<A, B extends A, C, D>(
  refinement: P.Refinement<A, B>,
  onTrue: (a: B) => C,
  onFalse: (a: A) => D
): (a: A) => C | D
function _if<A, B, C>(predicate: P.Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => C): (a: A) => B | C
function _if<A, B, C>(predicate: P.Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => C): (a: A) => B | C {
  return (a) => if_(a, predicate, onTrue, onFalse)
}

export { _if as if }

/**
 * @since 1.0.0
 */
export function increment(n: number): number {
  return n + 1
}

/**
 * @since 1.0.0
 */
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

/**
 * Creates a tupled version of this function: instead of `n` arguments, it accepts a single tuple argument.
 *
 * @since 1.0.0
 */
export function tupled<A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): (a: Readonly<A>) => B {
  return (a) => f(...a)
}

/**
 * @since 1.0.0
 * @optimize identity
 */
export const unsafeCoerce: <A, B>(a: A) => B = P.identity as any

/**
 * Inverse function of `tupled`
 *
 * @since 1.0.0
 */
export function untupled<A extends ReadonlyArray<unknown>, B>(f: (a: Readonly<A>) => B): (...a: A) => B {
  return (...a) => f(a)
}

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

/**
 * @category instances
 * @since 1.0.0
 */
export function getBooleanAlgebra<B>(B: P.BooleanAlgebra<B>): <A = never>() => P.BooleanAlgebra<(a: A) => B> {
  return () => ({
    meet: (x, y) => (a) => B.meet(x(a), y(a)),
    join: (x, y) => (a) => B.join(x(a), y(a)),
    zero: () => B.zero,
    one: () => B.one,
    implies: (x, y) => (a) => B.implies(x(a), y(a)),
    not: (x) => (a) => B.not(x(a))
  })
}

export * from '@principia/prelude/function'
