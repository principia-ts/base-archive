import type * as HKT from './HKT'

import { identity, tuple } from './Function'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface State<S, A> {
  (s: S): [A, S]
}

export const URI = 'State'
export type URI = typeof URI

export type V = HKT.V<'S', '_'>

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: State<S, A>
  }
}

/*
 * -------------------------------------------
 * State
 * -------------------------------------------
 */

/**
 * Get the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function get<S>(): State<S, S> {
  return (s) => [s, s]
}

/**
 * Set the state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function put<S>(s: S): State<S, void> {
  return () => [undefined, s]
}

/**
 * Modify the state by applying a function to the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function modify<S>(f: (s: S) => S): State<S, void> {
  return (s) => [undefined, f(s)]
}

/**
 * Get a value which depends on the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function gets<S, A>(f: (s: S) => A): State<S, A> {
  return (s) => [f(s), s]
}

/*
 * -------------------------------------------
 * Run
 * -------------------------------------------
 */

export function evaluate_<S, A>(ma: State<S, A>, s: S): A {
  return ma(s)[0]
}

export function evaluate<S>(s: S): <A>(ma: State<S, A>) => A {
  return (ma) => ma(s)[0]
}

export function execute_<S, A>(ma: State<S, A>, s: S): S {
  return ma(s)[1]
}

export function execute<S>(s: S): <A>(ma: State<S, A>) => S {
  return (ma) => ma(s)[1]
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<S = never, A = never>(a: A): State<S, A> {
  return (s) => [a, s]
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function product_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, readonly [A, B]> {
  return map2_(fa, fb, tuple)
}

export function product<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

export function map2_<S, A, B, C>(fa: State<S, A>, fb: State<S, B>, f: (a: A, b: B) => C): State<S, C> {
  return (s) => {
    const [a, s1] = fa(s)
    const [b, s2] = fb(s1)
    return [f(a, b), s2]
  }
}

export function map2<S, A, B, C>(fb: State<S, B>, f: (a: A, b: B) => C): (fa: State<S, A>) => State<S, C> {
  return (fa) => map2_(fa, fb, f)
}

export function ap_<S, A, B>(fab: State<S, (a: A) => B>, fa: State<S, A>): State<S, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function ap<S, A>(fa: State<S, A>): <B>(fab: State<S, (a: A) => B>) => State<S, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, A> {
  return map2_(fa, fb, (a, _) => a)
}

export function apl<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, B> {
  return map2_(fa, fb, (_, b) => b)
}

export function apr<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, B> {
  return (fa) => apr_(fa, fb)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<S, A, B>(fa: State<S, A>, f: (a: A) => B): State<S, B> {
  return (s) => {
    const [a, s2] = fa(s)
    return [f(a), s2]
  }
}

export function map<A, B>(f: (a: A) => B): <S>(fa: State<S, A>) => State<S, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<S, A, B>(ma: State<S, A>, f: (a: A) => State<S, B>): State<S, B> {
  return (s) => {
    const [a, s2] = ma(s)
    return f(a)(s2)
  }
}

export function bind<S, A, B>(f: (a: A) => State<S, B>): (ma: State<S, A>) => State<S, B> {
  return (ma) => bind_(ma, f)
}

export function tap_<S, A, B>(ma: State<S, A>, f: (a: A) => State<S, B>): State<S, A> {
  return bind_(ma, (a) => map_(f(a), () => a))
}

export function tap<S, A, B>(f: (a: A) => State<S, B>): (ma: State<S, A>) => State<S, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<S, A>(mma: State<S, State<S, A>>): State<S, A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit<S>(): State<S, void> {
  return (s) => [undefined, s]
}
